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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Calendar, Clock, MapPin, Users, Plus, BookOpen, Bell, BellRing, LogOut, Search, AlertCircle } from "lucide-react";
import BookingForm from "@/components/BookingForm";
import BookingCard from "@/components/BookingCard";
import { useToast } from "@/hooks/use-toast";
import { NotificationCenter } from "@/components/NotificationCenter";

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
  is_blocked?: boolean;
  is_under_maintenance?: boolean;
  status_note?: string | null;
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
  const [expandedHallId, setExpandedHallId] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string>("");

  // Use exactly three user images and cycle them across all halls
  // Images are at the project public root
  const customImages = [
    '/OIP.jpeg',
    '/OIP%20(1).jpeg',
    '/OIP%20(2).jpeg',
  ];

  const pickImageForHall = (_hall: Hall, listIndex: number) => {
    if (!customImages.length) return null;
    return customImages[listIndex % customImages.length];
  };

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
    
    setLoading(true);
    console.log('Fetching bookings for faculty:', profile.id);

    try {
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
        .eq('faculty_id', profile.id)
        .order('event_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} bookings`);
      setBookings(data || []);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  const randomImageForHall = (hall: Hall, width = 1200, height = 800) => {
    const keywords = [
      'seminar hall interior',
      'auditorium interior',
      'lecture hall',
      'conference room modern',
      'smart classroom'
    ];
    const q = keywords[Math.floor(Math.random() * keywords.length)]
      .replace(/\s+/g, '%20');
    // Unsplash Source serves high-quality, license-friendly images
    return `https://source.unsplash.com/featured/${width}x${height}/?${q}&sig=${encodeURIComponent(hall.id)}-${Date.now()}`;
  };

  // No specific-name mapping; we cycle images across halls using pickImageForHall

  const toggleExpandedImage = (hall: Hall, idx: number) => {
    if (expandedHallId === hall.id) {
      setExpandedHallId(null);
      setExpandedImageUrl("");
    } else {
      setExpandedHallId(hall.id);
      const chosen = pickImageForHall(hall, idx);
      const src = chosen || (customImages.length ? customImages[idx % customImages.length] : randomImageForHall(hall, 1000, 600));
      setExpandedImageUrl(src);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.filter(b => ['pending_hod', 'pending_principal', 'pending_pro'].includes(b.status)).length}</p>
              </div>
              <div className="h-8 w-8 bg-warning/10 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border rounded-card bg-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.filter(b => b.status === 'approved').length}</p>
              </div>
              <div className="h-8 w-8 bg-success/10 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="halls" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 border border-gray-200 rounded-lg">
          <TabsTrigger value="halls" className="data-[state=active]:bg-primary data-[state=active]:text-white">Available Halls</TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-primary data-[state=active]:text-white">My Bookings</TabsTrigger>
          <TabsTrigger value="notifications" className="relative data-[state=active]:bg-primary data-[state=active]:text-white">
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-white">
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
                {filteredHalls.map((hall, idx) => (
                  <Card key={hall.id} className={`${expandedHallId === hall.id ? 'ring-2 ring-primary' : ''} shadow-card border border-border rounded-2xl bg-gradient-card hover-elevate transition-all duration-200`}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex items-center gap-2 text-gray-900">
                            <MapPin className="h-5 w-5 text-primary" />
                            <span className="whitespace-normal break-words">{hall.name}</span>
                            {hall.is_under_maintenance && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Under Maintenance</Badge>
                            )}
                            {!hall.is_under_maintenance && hall.is_blocked && (
                              <Badge className="bg-red-100 text-red-800 border-red-200">Blocked</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            {hall.block} • {hall.type}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        Capacity: {hall.capacity} people
                      </div>                      <TooltipProvider>
                        <div className="flex flex-wrap gap-2">
                          {hall.has_ac && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-secondary/10 text-secondary border-secondary/20">AC</Badge>
                              </TooltipTrigger>
                              <TooltipContent>Air Conditioning available</TooltipContent>
                            </Tooltip>
                          )}
                          {hall.has_mic && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-secondary/10 text-secondary border-secondary/20">Mic</Badge>
                              </TooltipTrigger>
                              <TooltipContent>Microphone available</TooltipContent>
                            </Tooltip>
                          )}
                          {hall.has_projector && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-secondary/10 text-secondary border-secondary/20">Projector</Badge>
                              </TooltipTrigger>
                              <TooltipContent>Projector available</TooltipContent>
                            </Tooltip>
                          )}
                          {hall.has_audio_system && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-secondary/10 text-secondary border-secondary/20">Audio System</Badge>
                              </TooltipTrigger>
                              <TooltipContent>Audio system available</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>

                      <Button
                        onClick={() => handleBookHall(hall)}
                        className="w-full bg-primary hover:bg-primary-hover text-white shadow-button hover:shadow-button-hover rounded-button transition-all duration-200"
                        disabled={hall.is_blocked || hall.is_under_maintenance}
                        title={hall.is_under_maintenance ? (hall.status_note ? hall.status_note : 'Hall under maintenance') : (hall.is_blocked ? (hall.status_note || 'Hall is blocked') : 'Book Hall')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {hall.is_under_maintenance ? 'Unavailable (Maintenance)' : hall.is_blocked ? 'Unavailable (Blocked)' : 'Book Hall'}
                      </Button>

                      <Button
                        onClick={() => toggleExpandedImage(hall, idx)}
                        className="w-full bg-white text-primary border border-primary hover:bg-primary hover:text-white shadow-button hover:shadow-button-hover rounded-button transition-all duration-200"
                      >
                        View Photo
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

        {expandedHallId && expandedImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => { setExpandedHallId(null); setExpandedImageUrl(""); }}
          >
            <div
              className="mx-auto cursor-pointer"
              role="button"
              aria-label="Close photo"
            >
              <img
                src={expandedImageUrl}
                alt="Hall image"
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg ring-2 ring-white/70"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  export default FacultyDashboard;