import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useHallAvailability } from "@/hooks/useHallAvailability";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, BookOpen, Bell, BellRing, LogOut, Search, AlertCircle } from "lucide-react";
import BookingForm from "@/components/BookingForm";
import BookingCard from "@/components/BookingCard";
import { useToast } from "@/hooks/use-toast";

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
  hall_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: string;
  rejection_reason?: string;
  halls: Hall;
}

const FacultyDashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { halls, loading: hallsLoading, refreshAvailability } = useHallAvailability();
  const { toast } = useToast();
  const [filteredHalls, setFilteredHalls] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedHall, setSelectedHall] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchBookings();
  }, [profile]);

  useEffect(() => {
    const filtered = halls.filter(hall =>
      hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hall.block.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hall.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredHalls(filtered);
  }, [halls, searchTerm]);


  const fetchBookings = async () => {
    if (!profile?.id) return;

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
      .eq('faculty_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive"
      });
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_hod':
        return 'warning';
      case 'pending_principal':
        return 'warning';
      case 'pending_pro':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_hod':
        return 'Pending HOD Approval';
      case 'pending_principal':
        return 'Pending Principal Approval';
      case 'pending_pro':
        return 'Pending PRO Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleBookHall = (hall: Hall) => {
    setSelectedHall(hall);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingForm(false);
    setSelectedHall(null);
    fetchBookings();
    refreshAvailability();
    toast({
      title: "Success!",
      description: "Booking request submitted successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name} • {profile?.department} Department</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="relative">
              {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{bookings.filter(b => ['pending_hod', 'pending_principal', 'pending_pro'].includes(b.status)).length}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'approved').length}</p>
                </div>
                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="halls" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="halls">Available Halls</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              Notifications
              {unreadCount > 0 && (
                <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="halls" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Available Halls</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search halls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
            
            {hallsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading halls...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHalls.map((hall) => (
                  <Card key={hall.id} className={`hover:shadow-lg transition-shadow ${!hall.isAvailable ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        {hall.name}
                        {!hall.isAvailable && (
                          <Badge variant="destructive" className="ml-auto">
                            Booked
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {hall.block} • {hall.type}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Capacity: {hall.capacity} people
                      </div>
                      
                      {!hall.isAvailable && hall.currentBooking && (
                        <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                          <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>Booked until {hall.bookedUntil}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hall.currentBooking.event_name} by {hall.currentBooking.faculty_name}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {hall.has_ac && <Badge variant="secondary">AC</Badge>}
                        {hall.has_mic && <Badge variant="secondary">Mic</Badge>}
                        {hall.has_projector && <Badge variant="secondary">Projector</Badge>}
                        {hall.has_audio_system && <Badge variant="secondary">Audio System</Badge>}
                      </div>
                      
                      <Button 
                        onClick={() => handleBookHall(hall)} 
                        className="w-full"
                        disabled={!hall.isAvailable}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {hall.isAvailable ? "Book Hall" : "Currently Booked"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <h2 className="text-xl font-semibold">My Bookings</h2>
            
            {loading ? (
              <div className="text-center py-8">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No bookings found</p>
                  <p className="text-sm text-muted-foreground">Start by booking a hall from the available halls</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Notifications</h2>
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Mark All Read
                </Button>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No new notifications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                 {notifications.map((notification) => (
                   <Card key={notification.id} className={notification.read ? 'opacity-60' : ''}>
                     <CardContent className="p-4">
                       <div className="flex items-start justify-between">
                         <div className="flex-1">
                           <h4 className="font-medium text-sm">{notification.title}</h4>
                           <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                           <p className="text-xs text-muted-foreground mt-2">
                             {new Date(notification.created_at).toLocaleString()}
                           </p>
                         </div>
                         <div className="flex flex-col gap-2">
                           {!notification.read && (
                             <Badge variant="secondary">New</Badge>
                           )}
                           {!notification.read && (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => markAsRead(notification.id)}
                               className="text-xs"
                             >
                               Mark Read
                             </Button>
                           )}
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedHall && (
        <BookingForm
          hall={selectedHall}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedHall(null);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default FacultyDashboard;