import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, GraduationCap, Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookingCard from "@/components/BookingCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import BookedHallsOverview from "@/components/BookedHallsOverview";

const PrincipalDashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
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
  }, []);

  const pendingBookings = bookings.filter(b => b.status === 'pending_principal');
  const approvedBookings = bookings.filter(b => ['pending_pro', 'approved'].includes(b.status));
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');
  const allBookings = bookings;

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{approvedBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-green-500" />
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
                  <GraduationCap className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{allBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              All Department Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-5 gap-2 overflow-x-auto no-scrollbar">
                <TabsTrigger value="pending" className="relative border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">
                  Pending Review
                  {pendingBookings.length > 0 && (
                    <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {pendingBookings.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Rejected</TabsTrigger>
                <TabsTrigger value="booked" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Booked Halls</TabsTrigger>
                <TabsTrigger value="all" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">All Requests</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : pendingBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingBookings.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onStatusUpdate={fetchBookings}
                        showActions={true}
                        userRole="principal"
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="approved" className="mt-6">
                {approvedBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No approved requests</p>
                ) : (
                  <div className="space-y-4">
                    {approvedBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
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

              <TabsContent value="booked" className="mt-6">
                {/* Render booked halls overview inside the same card body */}
                <BookedHallsOverview />
              </TabsContent>

              <TabsContent value="all" className="mt-6">
                {allBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No requests found</p>
                ) : (
                  <div className="space-y-4">
                    {allBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
    </div>
  );
};

export default PrincipalDashboard;