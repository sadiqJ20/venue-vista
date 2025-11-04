import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Users, Trash2, Search, Shield, AlertCircle, Loader2, Wrench, Ban, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];
type HallRow = Database["public"]["Tables"]["halls"]["Row"];

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Hall management state
  const [halls, setHalls] = useState<HallRow[]>([]);
  const [hallsLoading, setHallsLoading] = useState(true);
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; hall: HallRow | null; action: 'block' | 'maintenance' | null; }>(
    { open: false, hall: null, action: null }
  );
  const [statusNote, setStatusNote] = useState("");

  // Verify admin role
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive"
      });
    }
  }, [profile, toast]);

  // Fetch all users
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
      fetchHalls();
    }
  }, [profile]);

  // Filter users based on search and role filter
  useEffect(() => {
    let filtered = users;

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.department && user.department.toLowerCase().includes(searchLower))
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching users.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHalls = async () => {
    setHallsLoading(true);
    try {
      const { data, error } = await supabase.from('halls').select('*').order('block').order('name');
      if (error) throw error;
      setHalls(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load halls', variant: 'destructive' });
    } finally {
      setHallsLoading(false);
    }
  };

  const notifyAllUsers = async (title: string, message: string, data?: any) => {
    try {
      const { data: usersList } = await supabase.from('profiles').select('user_id');
      const userIds = (usersList || []).map(u => u.user_id).filter(Boolean);
      for (const uid of userIds) {
        await supabase.rpc('send_notification', {
          recipient_user_id: uid as string,
          title,
          message,
          type: 'hall_status',
          data: data || null
        });
      }
    } catch (e) {
      console.warn('Notification broadcast failed', e);
    }
  };

  const updateHallStatus = async (hall: HallRow, updates: Partial<HallRow>, note: string) => {
    try {
      const { error } = await supabase
        .from('halls')
        .update({
          ...updates,
          status_note: note || null,
          status_updated_at: new Date().toISOString(),
          status_updated_by: profile?.id || null,
        })
        .eq('id', hall.id);
      if (error) throw error;

      // Notify everyone
      const statusText = updates.is_under_maintenance ? 'Under Maintenance'
        : updates.is_blocked ? 'Blocked'
        : 'Available';

      await notifyAllUsers(
        'Hall status updated',
        `${hall.name} is now ${statusText}${note ? ` — ${note}` : ''}`,
        { hall_id: hall.id, hall_name: hall.name, status: statusText, note }
      );

      toast({ title: 'Updated', description: `${hall.name} updated successfully.` });
      fetchHalls();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update hall', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    // Prevent admin from deleting themselves
    if (userId === profile?.id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete your own account.",
        variant: "destructive"
      });
      return;
    }

    setDeletingUserId(userId);
    try {
      // First, get the user_id from the profile to delete from auth.users
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        throw new Error('Failed to fetch user profile');
      }

      // Delete from profiles table (this will cascade to auth.users if CASCADE is set)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        throw deleteError;
      }

      // Also delete from auth.users if needed (requires admin privileges)
      // Note: This might require a Supabase Edge Function or admin API call
      // For now, we'll just delete from profiles and let the cascade handle it if configured

      toast({
        title: "Success",
        description: `User "${userName}" has been removed successfully.`,
        variant: "default"
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'chairman':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'principal':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'hod':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'faculty':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pro':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'chairman': return 'Chairman';
      case 'principal': return 'Principal';
      case 'hod': return 'HOD';
      case 'faculty': return 'Faculty';
      case 'pro': return 'PRO';
      default: return role;
    }
  };

  const roleOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'hod', label: 'HOD' },
    { value: 'principal', label: 'Principal' },
    { value: 'pro', label: 'PRO' },
    { value: 'chairman', label: 'Chairman' },
    { value: 'admin', label: 'Admin' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Faculty</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'faculty').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">HODs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'hod').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200 rounded-lg">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="halls">Hall Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
        <Card className="shadow-card border border-border rounded-card bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage all registered users in the system. You can view, filter, and remove users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || roleFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No users registered yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id === profile?.id ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Current User
                          </Badge>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingUserId === user.id}
                              >
                                {deletingUserId === user.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user account for <strong>{user.name}</strong> ({user.email}).
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Admin Notice</p>
              <p className="text-sm text-blue-700 mt-1">
                You cannot delete your own account. Removing a user will permanently delete their account and all associated data.
              </p>
            </div>
          </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="halls">
          <Card className="shadow-card border border-border rounded-card bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Hall Management
              </CardTitle>
              <CardDescription>
                View and manage hall availability. Block or mark halls as under maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hallsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading halls...</div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Block</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {halls.map(hall => {
                        const status = hall.is_under_maintenance ? 'Under Maintenance' : hall.is_blocked ? 'Blocked' : 'Available';
                        return (
                          <TableRow key={hall.id}>
                            <TableCell className="font-medium">{hall.name}</TableCell>
                            <TableCell>{hall.block}</TableCell>
                            <TableCell>{hall.type}</TableCell>
                            <TableCell>{hall.capacity}</TableCell>
                            <TableCell>
                              {status === 'Available' && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 flex gap-1"><CheckCircle className="h-3 w-3"/>Available</Badge>
                              )}
                              {status === 'Blocked' && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 flex gap-1"><Ban className="h-3 w-3"/>Blocked</Badge>
                              )}
                              {status === 'Under Maintenance' && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex gap-1"><Wrench className="h-3 w-3"/>Maintenance</Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px] whitespace-pre-wrap">{hall.status_note || '-'}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant={hall.is_blocked ? 'outline' : 'destructive'}
                                size="sm"
                                onClick={() => setNoteDialog({ open: true, hall, action: hall.is_blocked ? 'block' : 'block' })}
                              >
                                {hall.is_blocked ? 'Unblock' : 'Block'}
                              </Button>
                              <Button
                                variant={hall.is_under_maintenance ? 'outline' : 'secondary'}
                                size="sm"
                                onClick={() => setNoteDialog({ open: true, hall, action: 'maintenance' })}
                              >
                                {hall.is_under_maintenance ? 'Clear Maintenance' : 'Mark Maintenance'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Note dialog */}
              <AlertDialog open={noteDialog.open} onOpenChange={(open) => {
                if (!open) { setNoteDialog({ open: false, hall: null, action: null }); setStatusNote(''); }
              }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {noteDialog.action === 'maintenance' ? 'Maintenance Status' : 'Block/Unblock Hall'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Add an optional note/reason to notify users.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add note (optional)"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setNoteDialog({ open: false, hall: null, action: null }); setStatusNote(''); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      if (!noteDialog.hall) return;
                      if (noteDialog.action === 'maintenance') {
                        updateHallStatus(noteDialog.hall, { is_under_maintenance: !noteDialog.hall.is_under_maintenance, is_blocked: false }, statusNote);
                      } else {
                        updateHallStatus(noteDialog.hall, { is_blocked: !noteDialog.hall.is_blocked, is_under_maintenance: false }, statusNote);
                      }
                      setNoteDialog({ open: false, hall: null, action: null });
                      setStatusNote('');
                    }}>Save</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;

