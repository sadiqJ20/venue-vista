import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useHallAvailability } from "@/hooks/useHallAvailability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserCheck, Bell, BellRing, MapPin, Users, AlertCircle, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookingCard from "@/components/BookingCard";
import HallSwitchDialog from "@/components/HallSwitchDialog";
import { NotificationCenter } from "@/components/NotificationCenter";

const HODDashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const { halls, loading: hallsLoading, refreshAvailability } = useHallAvailability();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchBookings = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (
            name,
            block,
            type,
            capacity
          )
        `)
        .eq('department', profile.department)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [profile]);

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

  const pendingBookings = bookings.filter(b => b.status === 'pending_hod');
  const acceptedBookings = bookings.filter(b => ['pending_principal', 'pending_pro', 'approved'].includes(b.status));
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">HOD Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name} • {profile?.department} Department</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <Button variant="outline" onClick={signOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8">
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending" className="relative">
                    Pending
                    {pendingBookings.length > 0 && (
                      <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {pendingBookings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="accepted">Accepted</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
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