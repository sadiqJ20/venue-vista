import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { LogOut, Briefcase, Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import BookingCard from "@/components/BookingCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import BookedHallsOverview from "@/components/BookedHallsOverview";

const PRODashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const { toast } = useToast();
  type Booking = {
    id: string;
    event_name: string;
    event_date: string;
    start_time: string;
    end_time: string;
    status: 'pending_hod' | 'pending_principal' | 'pending_pro' | 'approved' | 'rejected';
    department: string;
    faculty_name: string;
    organizer_name: string;
    halls: {
      id: string;
      name: string;
      block: string;
      type: string;
      capacity: number;
    } | null;
  };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    console.log('Fetching bookings for PRO...');
    
    try {
      // First, verify the table structure
      console.log('Checking bookings table structure...');
      
      // Fetch all approved bookings with all fields needed for the View Details modal
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
        .or('status.eq.approved,status.eq.pending_pro')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} approved bookings`);
      console.log('Sample booking data:', data?.[0]);
      setBookings(data || []);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('PRODashboard mounted, fetching bookings...');
    console.log('Profile:', profile);
    
    const fetchData = async () => {
      try {
        // Test the connection first
        console.log('Testing database connection...');
        const { data: testData, error: testError } = await supabase
          .from('bookings')
          .select('id')
          .limit(1);
          
        if (testError) {
          console.error('Database connection test failed:', testError);
          toast({
            title: 'Database Error',
            description: 'Could not connect to the database. Please try again later.',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('Database connection test successful');
        await fetchBookings();
      } catch (error) {
        console.error('Error in initial data fetch:', error);
        toast({
          title: 'Error',
          description: 'Failed to load bookings. Please refresh the page.',
          variant: 'destructive',
        });
      }
    };
    
    fetchData();
  }, [profile?.id]);

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
                      <BookingCard 
                        key={booking.id} 
                        booking={booking} 
                        userRole="pro"
                        showActions={false}
                      />
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