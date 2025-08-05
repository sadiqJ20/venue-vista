import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, BookOpen, Bell, LogOut } from "lucide-react";
import BookingForm from "@/components/BookingForm";
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
  const { toast } = useToast();
  const [halls, setHalls] = useState<Hall[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHalls();
    fetchBookings();
  }, []);

  const fetchHalls = async () => {
    const { data, error } = await supabase
      .from('halls')
      .select('*')
      .order('block', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch halls",
        variant: "destructive"
      });
    } else {
      setHalls(data || []);
    }
  };

  const fetchBookings = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        halls (*)
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
            <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {profile?.department}
            </Badge>
            <Button variant="outline" onClick={signOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="halls" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="halls">Available Halls</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="halls" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Available Halls</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {halls.map((hall) => (
                <Card key={hall.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {hall.name}
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
                    
                    <div className="flex flex-wrap gap-2">
                      {hall.has_ac && <Badge variant="secondary">AC</Badge>}
                      {hall.has_mic && <Badge variant="secondary">Mic</Badge>}
                      {hall.has_projector && <Badge variant="secondary">Projector</Badge>}
                      {hall.has_audio_system && <Badge variant="secondary">Audio System</Badge>}
                    </div>
                    
                    <Button 
                      onClick={() => handleBookHall(hall)} 
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Book Hall
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{booking.event_name}</CardTitle>
                          <CardDescription>{booking.halls.name}</CardDescription>
                        </div>
                        <Badge variant={getStatusColor(booking.status) as any}>
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(booking.event_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {booking.start_time} - {booking.end_time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {booking.halls.block}
                        </div>
                      </div>
                      
                      {booking.rejection_reason && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm text-destructive font-medium">Rejection Reason:</p>
                          <p className="text-sm text-destructive">{booking.rejection_reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <h2 className="text-xl font-semibold">Notifications</h2>
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No new notifications</p>
              </CardContent>
            </Card>
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