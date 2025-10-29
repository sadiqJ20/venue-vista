import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Briefcase, Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookingCard from "@/components/BookingCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import BookedHallsOverview from "@/components/BookedHallsOverview";

const PRODashboard = () => {
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
        .eq('status', 'approved') // PRO only sees approved bookings
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

  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmed Bookings</p>
                  <p className="text-2xl font-bold">{approvedBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Confirmed Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="approved" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger value="approved" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Confirmed Bookings</TabsTrigger>
                <TabsTrigger value="booked" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Booked Halls</TabsTrigger>
              </TabsList>
              
              <TabsContent value="approved" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : approvedBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No confirmed bookings</p>
                ) : (
                  <div className="space-y-4">
                    {approvedBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="booked" className="mt-6">
                {/* Render booked halls overview inside the same card body for PRO */}
                <BookedHallsOverview />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
    </div>
  );
};

export default PRODashboard;