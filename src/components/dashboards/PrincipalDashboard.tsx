import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { LogOut, GraduationCap, Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import BookingCard from "@/components/BookingCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import BookedHallsOverview from "@/components/BookedHallsOverview";
import { useStatistics } from "@/hooks/useStatistics";
import * as XLSX from "xlsx";

const PrincipalDashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    console.log('Fetching bookings for Principal...');
    
    try {
      // Fetch all bookings that are either:
      // 1. Pending principal approval (from any department), OR
      // 2. Already approved
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
        .or('status.eq.pending_principal,status.eq.approved')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} bookings`);
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
    console.log('PrincipalDashboard mounted, fetching bookings...');
    console.log('Profile:', profile);
    fetchBookings();
  }, [profile?.id]);

  const pendingBookings = bookings.filter(b => b.status === 'pending_principal');
  const approvedBookings = bookings.filter(b => b.status === 'approved'); // Principal is now final approver
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');
  const allBookings = bookings;

  // Statistics state
  const stats = useStatistics(null, null);

  const exportToExcel = () => {
    if (!stats.data) return;
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Statistics Export"],
      ["From", stats.data.fromDate || "All"],
      ["To", stats.data.toDate || "All"],
      ["Total Bookings", stats.data.totalBookings],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const hallsMost = XLSX.utils.json_to_sheet(stats.data.halls.mostUsed);
    XLSX.utils.book_append_sheet(wb, hallsMost, "Halls - MostUsed");

    const hallsLeast = XLSX.utils.json_to_sheet(stats.data.halls.leastUsed);
    XLSX.utils.book_append_sheet(wb, hallsLeast, "Halls - LeastUsed");

    const deptMost = XLSX.utils.json_to_sheet(stats.data.departments.mostActive);
    XLSX.utils.book_append_sheet(wb, deptMost, "Dept - MostActive");

    const deptLeast = XLSX.utils.json_to_sheet(stats.data.departments.leastActive);
    XLSX.utils.book_append_sheet(wb, deptLeast, "Dept - LeastActive");

    XLSX.writeFile(wb, `venue-vista-statistics_${Date.now()}.xlsx`);
  };

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
            <TabsList className="grid w-full grid-cols-6 gap-2 overflow-x-auto no-scrollbar">
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
              <TabsTrigger value="statistics" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400">Statistics</TabsTrigger>
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

              <TabsContent value="statistics" className="mt-6">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                    <div className="flex flex-col">
                      <label className="text-sm text-muted-foreground">From</label>
                      <input
                        type="date"
                        className="border rounded-md px-3 py-2 text-sm"
                        value={stats.fromDate ?? ''}
                        onChange={(e) => stats.setFromDate(e.target.value || null)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm text-muted-foreground">To</label>
                      <input
                        type="date"
                        className="border rounded-md px-3 py-2 text-sm"
                        value={stats.toDate ?? ''}
                        onChange={(e) => stats.setToDate(e.target.value || null)}
                      />
                    </div>
                    <Button onClick={() => stats.refetch()} disabled={stats.loading}>
                      {stats.loading ? 'Loading…' : 'Apply'}
                    </Button>
                    <Button variant="outline" onClick={exportToExcel} disabled={stats.loading || !stats.data}>
                      Export to Excel
                    </Button>
                  </div>

                  {stats.error && (
                    <p className="text-sm text-red-600">{stats.error}</p>
                  )}

                  {!stats.loading && stats.data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Most Used Halls</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.data.halls.mostUsed.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left border-b">
                                  <th className="py-2">Hall</th>
                                  <th className="py-2">Bookings</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.data.halls.mostUsed.map((h) => (
                                  <tr key={h.name} className="border-b">
                                    <td className="py-2">{h.name}</td>
                                    <td className="py-2">{h.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Least Used Halls</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.data.halls.leastUsed.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left border-b">
                                  <th className="py-2">Hall</th>
                                  <th className="py-2">Bookings</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.data.halls.leastUsed.map((h) => (
                                  <tr key={h.name} className="border-b">
                                    <td className="py-2">{h.name}</td>
                                    <td className="py-2">{h.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Most Active Departments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.data.departments.mostActive.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left border-b">
                                  <th className="py-2">Department</th>
                                  <th className="py-2">Bookings</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.data.departments.mostActive.map((d) => (
                                  <tr key={d.name} className="border-b">
                                    <td className="py-2">{d.name}</td>
                                    <td className="py-2">{d.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Least Active Departments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.data.departments.leastActive.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left border-b">
                                  <th className="py-2">Department</th>
                                  <th className="py-2">Bookings</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.data.departments.leastActive.map((d) => (
                                  <tr key={d.name} className="border-b">
                                    <td className="py-2">{d.name}</td>
                                    <td className="py-2">{d.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
    </div>
  );
};

export default PrincipalDashboard;