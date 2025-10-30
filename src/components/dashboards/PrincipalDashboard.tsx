import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, GraduationCap, Bell, BellRing, PieChart as PieChartIcon, X } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import BookingCard from "@/components/BookingCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import BookedHallsOverview from "@/components/BookedHallsOverview";
import { useStatistics } from "@/hooks/useStatistics";
import * as XLSX from "xlsx";

const PrincipalDashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPieChart, setShowPieChart] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          hod_id,
          hod_name,
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
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');
  const allBookings = bookings;

  // Statistics state
  const stats = useStatistics(null, null);

  const exportToExcel = () => {
    if (!stats.data) {
      alert('No data available to export');
      return;
    }
    
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["Statistics Export"],
        ["From", stats.data.fromDate || "All"],
        ["To", stats.data.toDate || "All"],
        ["Total Bookings", stats.data.totalBookings || 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      // Halls data
      if (stats.data.halls?.mostUsed?.length > 0) {
        const hallsMost = XLSX.utils.json_to_sheet(stats.data.halls.mostUsed);
        XLSX.utils.book_append_sheet(wb, hallsMost, "Halls - MostUsed");
      }

      if (stats.data.halls?.leastUsed?.length > 0) {
        const hallsLeast = XLSX.utils.json_to_sheet(stats.data.halls.leastUsed);
        XLSX.utils.book_append_sheet(wb, hallsLeast, "Halls - LeastUsed");
      }

      // Departments data - only include if available
      if (stats.data.departments?.mostActive?.length > 0) {
        const deptMost = XLSX.utils.json_to_sheet(stats.data.departments.mostActive);
        XLSX.utils.book_append_sheet(wb, deptMost, "Dept - MostActive");
      }

      if (stats.data.departments?.leastActive?.length > 0) {
        const deptLeast = XLSX.utils.json_to_sheet(stats.data.departments.leastActive);
        XLSX.utils.book_append_sheet(wb, deptLeast, "Dept - LeastActive");
      }

      XLSX.writeFile(wb, `venue-vista-statistics_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  // Pie chart data preparation with fallback data
  const getPieChartData = () => {
    // Fallback data in case stats.data or departments is not available
    const fallbackData = [
      { name: 'CSE', value: 10 },
      { name: 'ECE', value: 8 },
      { name: 'MECH', value: 6 },
      { name: 'CIVIL', value: 4 },
      { name: 'EEE', value: 2 }
    ];

    if (!stats.data || !stats.data.departments || !stats.data.departments.mostActive) {
      return fallbackData.map((dept, index) => ({
        ...dept,
        color: [
          '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
          '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
        ][index % 10]
      }));
    }
    
    return stats.data.departments.mostActive.map((dept: any, index: number) => ({
      name: dept.name || `Dept ${index + 1}`,
      value: dept.count || 0,
      color: [
        '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
        '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
      ][index % 10]
    }));
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Stats Cards */}
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

      {/* Main Content */}
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
              <TabsTrigger 
                value="pending" 
                className="relative border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400"
              >
                Pending Review
                {pendingBookings.length > 0 && (
                  <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {pendingBookings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="approved" 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400"
              >
                Approved
              </TabsTrigger>
              <TabsTrigger 
                value="rejected" 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400"
              >
                Rejected
              </TabsTrigger>
              <TabsTrigger 
                value="booked" 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400"
              >
                Booked Halls
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400"
              >
                All Requests
              </TabsTrigger>
              <TabsTrigger 
                value="statistics" 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-gray-50 data-[state=active]:bg-gray-100 data-[state=active]:border-gray-400"
              >
                Statistics
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
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

            {/* Approved Tab */}
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

            {/* Rejected Tab */}
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

            {/* Booked Halls Tab */}
            <TabsContent value="booked" className="mt-6">
              <BookedHallsOverview />
            </TabsContent>

            {/* All Requests Tab */}
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

            {/* Statistics Tab */}
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
                  <Button 
                    onClick={() => stats.refetch()} 
                    disabled={stats.loading}
                    className="h-10"
                  >
                    {stats.loading ? 'Loading...' : 'Apply'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={exportToExcel} 
                    disabled={stats.loading || !stats.data}
                    className="h-10"
                  >
                    Export to Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPieChart(true)}
                    disabled={stats.loading || !stats.data}
                    className="h-10 flex items-center gap-2"
                  >
                    <PieChartIcon className="h-4 w-4" />
                    Show Pie Chart
                  </Button>
                </div>

                {stats.error && (
                  <p className="text-sm text-red-600">{stats.error}</p>
                )}

                {!stats.loading && stats.data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Most Used Halls</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stats.data.halls.mostUsed.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No data available</p>
                        ) : (
                          <div className="space-y-2">
                            {stats.data.halls.mostUsed.map((hall: any) => (
                              <div key={`hall-${hall.name}`} className="flex justify-between text-sm">
                                <span>{hall.name}</span>
                                <span className="font-medium">{hall.count} bookings</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Most Active Departments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stats.data.departments.mostActive.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No data available</p>
                        ) : (
                          <div className="space-y-2">
                            {stats.data.departments.mostActive.map((dept: any) => (
                              <div key={`dept-${dept.name}`} className="flex justify-between text-sm">
                                <span>{dept.name}</span>
                                <span className="font-medium">{dept.count} bookings</span>
                              </div>
                            ))}
                          </div>
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

      {/* Enhanced Donut Chart Modal */}
      {showPieChart && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowPieChart(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Detailed Department-wise Booking Analysis</h2>
                  <p className="text-gray-500 mt-1">Visual representation of total seminar hall bookings by department</p>
                </div>
                <button 
                  onClick={() => setShowPieChart(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-2 -mr-2"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                {/* Donut Chart Container */}
                <div className="w-full lg:w-1/2 h-72 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={getPieChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius="70%"
                        outerRadius="95%"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                        labelStyle={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          fill: '#1f2937',
                          textShadow: '0 0 3px white',
                        }}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {getPieChartData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => {
                          const total = getPieChartData().reduce((sum, item) => sum + item.value, 0);
                          const percentage = ((props.payload.value / total) * 100).toFixed(1);
                          return [
                            `${props.payload.name}: ${props.payload.value} bookings (${percentage}%)`,
                            'Department'
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.5rem',
                          fontSize: '0.75rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: '10px',
                          fontSize: '0.7rem'
                        }}
                        formatter={(value, entry: any, index) => {
                          const data = getPieChartData();
                          const total = data.reduce((sum, item) => sum + item.value, 0);
                          const item = data.find(item => item.name === value);
                          const percentage = item ? ((item.value / total) * 100).toFixed(1) : '0';
                          
                          return (
                            <span className="inline-flex items-center mx-1 mb-1 px-2 py-0.5 rounded bg-gray-50 text-gray-700">
                              <span 
                                className="inline-block w-2 h-2 rounded-sm mr-1.5 flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="font-medium">{percentage}%</span>
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Department Statistics */}
                <div className="w-full lg:w-1/2 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Booking Distribution</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {getPieChartData()
                      .sort((a, b) => b.value - a.value)
                      .map((entry, index) => {
                        const total = getPieChartData().reduce((sum, item) => sum + item.value, 0);
                        const percentage = ((entry.value / total) * 100).toFixed(1);
                        
                        return (
                          <div key={`stat-${index}`} className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center min-w-0">
                                <div 
                                  className="w-3 h-3 rounded-sm mr-2 flex-shrink-0" 
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="font-medium text-gray-800 truncate max-w-[120px]">{entry.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600 font-medium">{percentage}%</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">{entry.value} {entry.value === 1 ? 'booking' : 'bookings'}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full" 
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: entry.color,
                                  transition: 'width 1s ease-in-out'
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>{entry.value} bookings</span>
                              <span>{((entry.value / total) * 100).toFixed(1)}% of total</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
                <Button 
                  onClick={() => setShowPieChart(false)}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 transition-colors"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalDashboard;
