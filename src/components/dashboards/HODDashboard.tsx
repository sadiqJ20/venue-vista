import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHallAvailability } from "@/hooks/useHallAvailability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserCheck, Bell, BellRing, MapPin, Users, AlertCircle, ArrowRightLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookingCard from "@/components/BookingCard";
import HallSwitchDialog from "@/components/HallSwitchDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useToast } from "@/hooks/use-toast";

// Types
type BookingStatus = 'pending_hod' | 'pending_principal' | 'pending_pro' | 'approved' | 'rejected';

interface Hall {
  id: string;
  name: string;
  block: string;
  type: string;
  capacity: number;
  has_ac: boolean;
  has_mic: boolean;
  has_projector: boolean;
  has_audio_system: boolean;
}

interface Booking {
  id: string;
  event_name: string;
  faculty_name: string;
  department: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  rejection_reason?: string;
  hall_id: string;
  halls: Hall;
  created_at: string;
  updated_at: string;
  faculty_id: string;
  hod_id?: string;
  hod_name?: string;
}

// Mock notifications if the hook fails
const useMockNotifications = () => ({
  notifications: [],
  unreadCount: 0,
  markAllAsRead: () => {}
});

// Try to import useNotifications, but don't fail if it doesn't exist
let useNotifications = useMockNotifications;
try {
  // @ts-ignore - Dynamic import to prevent build-time errors
  const notificationsModule = require('@/hooks/useNotifications');
  useNotifications = notificationsModule.default || useMockNotifications;
} catch (error) {
  console.warn('useNotifications hook not available, using mock data');
}

const HODDashboard = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  
  // Use notifications hook with fallback to mock data
  const { notifications = [], unreadCount = 0, markAllAsRead = () => {} } = useNotifications();
  const { halls, loading: hallsLoading, refreshAvailability } = useHallAvailability();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchBookings = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      console.log('Fetching bookings for HOD:', profile.id);
      
      // First, get the department from the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', profile.id)
        .single();

      if (profileError || !profileData?.department) {
        console.error('Error fetching department:', profileError);
        throw new Error('Could not determine department');
      }

      // Then fetch all bookings for this department
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (
            id,
            name,
            block,
            type,
            capacity,
            has_ac,
            has_mic,
            has_projector,
            has_audio_system
          )
        `)
        .or(`department.eq.${profileData.department},faculty_id.eq.${profile.id}`)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} bookings for department ${profileData.department}`);
      setBookings(data || []);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchBookings();
    }
  }, [profile?.id]);

  const handleSwitchHall = (booking: any) => {
    setSelectedBooking(booking);
    setShowSwitchDialog(true);
  };

  const handleSwitchSuccess = () => {
    fetchBookings();
    refreshAvailability();
    setShowSwitchDialog(false);
    setSelectedBooking(null);
  };

  // Categorize bookings by status
  const pendingBookings = bookings.filter(b => b.status === 'pending_hod');
  const inReviewBookings = bookings.filter(b => ['pending_principal', 'pending_pro'].includes(b.status));
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');
  
  // Get upcoming and past bookings
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
  
  const upcomingBookings = bookings.filter(booking => {
    if (booking.event_date > today) return true;
    if (booking.event_date === today && booking.end_time > currentTime) return true;
    return false;
  });
  
  const pastBookings = bookings.filter(booking => {
    if (booking.event_date < today) return true;
    if (booking.event_date === today && booking.end_time < currentTime) return true;
    return false;
  });
  
  // Get status badge
  const getStatusBadge = (status: BookingStatus) => {
    const statusConfig = {
      pending_hod: { label: 'Pending HOD Approval', variant: 'warning' },
      pending_principal: { label: 'Pending Principal', variant: 'warning' },
      pending_pro: { label: 'Pending PRO Review', variant: 'info' },
      approved: { label: 'Approved', variant: 'success' },
      rejected: { label: 'Rejected', variant: 'destructive' }
    };
    
    const config = statusConfig[status] || { label: status, variant: 'default' };
    return (
      <Badge variant={config.variant as any} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold">{pendingBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{acceptedBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{rejectedBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-red-500/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Department Booking Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3 gap-2">
                  <TabsTrigger value="pending" className="relative border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">
                    Pending
                    {pendingBookings.length > 0 && (
                      <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {pendingBookings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="accepted" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Accepted</TabsTrigger>
                  <TabsTrigger value="rejected" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Rejected</TabsTrigger>
                </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : pendingBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingBookings.map(booking => (
                      <div key={booking.id} className="space-y-2">
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={fetchBookings}
                          showActions={true}
                          userRole="hod"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitchHall(booking)}
                          className="w-full"
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Switch Hall
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="accepted" className="mt-6">
                {acceptedBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No accepted requests</p>
                ) : (
                  <div className="space-y-4">
                    {acceptedBookings.map(booking => (
                      <div key={booking.id} className="space-y-2">
                        <BookingCard booking={booking} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitchHall(booking)}
                          className="w-full"
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Switch Hall
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="rejected" className="mt-6">
                {rejectedBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No rejected requests</p>
                ) : (
                  <div className="space-y-4">
                    {rejectedBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Hall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="available" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="available">Available Halls</TabsTrigger>
                <TabsTrigger value="booked">Booked Halls</TabsTrigger>
              </TabsList>
              
              <TabsContent value="available" className="mt-6">
                {hallsLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading halls...</p>
                ) : (
                  <div className="space-y-4">
                    {halls.filter(hall => hall.isAvailable).map(hall => (
                      <Card key={hall.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{hall.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {hall.block} • {hall.type} • Capacity: {hall.capacity}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Available
                          </Badge>
                        </div>
                      </Card>
                    ))}
                    {halls.filter(hall => hall.isAvailable).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">All halls are currently booked</p>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="booked" className="mt-6">
                {hallsLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading halls...</p>
                ) : (
                  <div className="space-y-4">
                    {halls.filter(hall => !hall.isAvailable).map(hall => (
                      <Card key={hall.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{hall.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {hall.block} • {hall.type} • Capacity: {hall.capacity}
                            </p>
                            {hall.currentBooking && (
                              <div className="mt-2 p-2 bg-muted rounded">
                                <p className="text-sm font-medium">{hall.currentBooking.event_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  by {hall.currentBooking.faculty_name} • Until {hall.bookedUntil}
                                </p>
                              </div>
                            )}
                          </div>
                          <Badge variant="destructive">
                            Booked
                          </Badge>
                        </div>
                      </Card>
                    ))}
                    {halls.filter(hall => !hall.isAvailable).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No halls are currently booked</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>

      {/* Hall Switch Dialog */}
      {showSwitchDialog && selectedBooking && (
        <HallSwitchDialog
          booking={selectedBooking}
          open={showSwitchDialog}
          onClose={() => setShowSwitchDialog(false)}
          onSuccess={handleSwitchSuccess}
        />
      )}
    </div>
  );
};

export default HODDashboard;