import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHallAvailability } from "@/hooks/useHallAvailability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserCheck, Bell, BellRing, MapPin, Users, AlertCircle, ArrowRightLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import BookingCard from "@/components/BookingCard";
import HallSwitchDialog from "@/components/HallSwitchDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useToast } from "@/hooks/use-toast";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  halls: {
    id: string;
    name: string;
    block: string;
    type: string;
    capacity: number;
    has_ac: boolean;
    has_mic: boolean;
    has_projector: boolean;
    has_audio_system: boolean;
  };
};

type BookingStatus = Booking["status"];

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
  
  console.log('HODDashboard - Profile:', profile); // Debug log
  
  // Use notifications hook with fallback to mock data
  const { notifications = [], unreadCount = 0, markAllAsRead = () => {} } = useNotifications();
  const { halls, loading: hallsLoading, refreshAvailability } = useHallAvailability();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Fetch bookings when component mounts and when profile changes
  useEffect(() => {
    if (profile?.id) {
      console.log('HODDashboard - Profile changed, fetching bookings...');
      fetchBookings();
    }
  }, [profile?.id]);
  
  const fetchBookings = async () => {
    if (!profile?.id) {
      console.error('No profile ID available');
      toast({
        title: 'Error',
        description: 'User profile not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('Fetching bookings for HOD with ID:', profile.id);
    
    try {
      // First, get the full profile to verify role and department
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Could not load user profile');
      }

      // Verify user is HOD
      if (profileData.role !== 'hod') {
        console.error('User does not have HOD role');
        throw new Error('You do not have permission to access this dashboard');
      }

      if (!profileData.department) {
        console.error('HOD has no department assigned');
        throw new Error('No department assigned to your profile. Please contact support.');
      }

      // Log HOD profile data for debugging
      console.log('[HOD Dashboard] HOD Profile:', {
        id: profileData.id,
        department: profileData.department,
        role: profileData.role,
        email: profileData.email
      });
      
      if (!profileData.department) {
        const errorMsg = 'No department assigned to HOD profile';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // 1. First, fetch all bookings for the HOD's department
      console.log(`[HOD Dashboard] Fetching bookings for department: ${profileData.department}`);
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('department', profileData.department)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('[HOD Dashboard] Error fetching bookings:', bookingsError);
        throw new Error('Failed to load bookings');
      }

      console.log(`[HOD Dashboard] Found ${bookingsData?.length || 0} bookings for department ${profileData.department}`);
      
      if (bookingsData && bookingsData.length > 0) {
        console.log('[HOD Dashboard] Sample booking:', {
          id: bookingsData[0].id,
          event_name: bookingsData[0].event_name,
          status: bookingsData[0].status,
          department: bookingsData[0].department,
          hall_id: bookingsData[0].hall_id
        });
      }
      
      // 2. Fetch hall information for these bookings
      const hallIds = [...new Set(bookingsData?.map(b => b.hall_id).filter(Boolean))];
      console.log(`[HOD Dashboard] Fetching ${hallIds.length} unique halls`);
      
      let hallsMap = new Map();
      if (hallIds.length > 0) {
        const { data: hallsData, error: hallsError } = await supabase
          .from('halls')
          .select('*')
          .in('id', hallIds);

        if (hallsError) {
          console.error('[HOD Dashboard] Error fetching halls:', hallsError);
          // Continue with empty halls map if there's an error
        } else if (hallsData && hallsData.length > 0) {
          console.log(`[HOD Dashboard] Fetched ${hallsData.length} halls`);
          hallsMap = new Map(hallsData.map(hall => [hall.id, hall]));
        } else {
          console.warn('[HOD Dashboard] No halls data found for the given IDs');
        }
      }
      
      // Combine bookings with their hall data
      const processedBookings = (bookingsData || []).map(booking => {
        const hall = booking.hall_id ? hallsMap.get(booking.hall_id) : null;
        
        // Log any missing hall data for debugging
        if (booking.hall_id && !hall) {
          console.warn(`[HOD Dashboard] No hall data found for hall_id: ${booking.hall_id} in booking ${booking.id}`);
        }
        
        return {
          ...booking,
          // Ensure all required fields have fallback values
          event_name: booking.event_name || 'Unnamed Event',
          faculty_name: booking.faculty_name || 'Unknown Faculty',
          // Add hall data if available
          halls: hall ? {
            id: hall.id,
            name: hall.name || 'Unknown Hall',
            block: hall.block || 'Unknown Block',
            type: hall.type || 'Unknown Type',
            capacity: hall.capacity || 0,
            has_ac: hall.has_ac || false,
            has_mic: hall.has_mic || false,
            has_projector: hall.has_projector || false,
            has_audio_system: hall.has_audio_system || false
          } : null
        };
      });

      // Sort bookings: pending_hod first, then by creation date (newest first)
      const sortedBookings = [...processedBookings].sort((a, b) => {
        // Pending HOD approvals first
        if (a.status === 'pending_hod' && b.status !== 'pending_hod') return -1;
        if (a.status !== 'pending_hod' && b.status === 'pending_hod') return 1;
        
        // Then sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log(`Processed ${sortedBookings.length} bookings for display`);
      
      // Log sample data for debugging
      if (sortedBookings.length > 0) {
        console.log('Sample booking data:', {
          id: sortedBookings[0].id,
          event_name: sortedBookings[0].event_name,
          status: sortedBookings[0].status,
          department: sortedBookings[0].department,
          created_at: sortedBookings[0].created_at,
          hasHall: !!sortedBookings[0].halls
        });
      }

      setBookings(sortedBookings);
      
    } catch (error: any) {
      console.error('[HOD Dashboard] Error in fetchBookings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
  const acceptedBookings = [...approvedBookings];
  
  // Get upcoming and past bookings
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
  
  const upcomingBookings = bookings.filter(booking => {
    if (!booking.event_date) return false;
    if (booking.event_date > today) return true;
    if (booking.event_date === today && booking.end_time > currentTime) return true;
    return false;
  });
  
  const pastBookings = bookings.filter(booking => {
    if (!booking.event_date) return false;
    if (booking.event_date < today) return true;
    if (booking.event_date === today && booking.end_time < currentTime) return true;
    return false;
  });
  
  // Define valid status types
  type BookingStatusType = 'pending_hod' | 'pending_principal' | 'pending_pro' | 'approved' | 'rejected';

  // Get status badge with proper type safety
  const getStatusBadge = (status: string) => {
    // Type guard to check if status is valid
    const isValidStatus = (s: string): s is BookingStatusType => {
      return ['pending_hod', 'pending_principal', 'pending_pro', 'approved', 'rejected'].includes(s);
    };

    const statusConfig = {
      pending_hod: { label: 'Pending HOD Approval', variant: 'secondary' as const },
      pending_principal: { label: 'Pending Principal', variant: 'secondary' as const },
      pending_pro: { label: 'Pending PRO Review', variant: 'outline' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const },
      default: { label: status, variant: 'outline' as const }
    };
    
    // Use the status if it's valid, otherwise use default
    const config = isValidStatus(status) 
      ? statusConfig[status] 
      : statusConfig.default;
      
    return (
      <Badge variant={config.variant} className="capitalize">
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