import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  department: string;
  faculty_name: string;
  status: string;
  halls?: {
    name: string;
    block: string;
  } | null;
}

const ChairmanDashboard = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const fetchEvents = async (filterDate?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (
            name,
            block
          )
        `)
        .order('event_date', { ascending: false });

      // Apply date filter if provided
      if (filterDate) {
        query = query.eq('event_date', filterDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFilter = () => {
    fetchEvents(selectedDate);
  };

  const handleClearFilter = () => {
    setSelectedDate("");
    fetchEvents();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      'pending_hod': { color: 'bg-yellow-500', label: 'Pending HOD' },
      'pending_principal': { color: 'bg-blue-500', label: 'Pending Principal' },
      'pending_pro': { color: 'bg-purple-500', label: 'Pending PRO' },
      'approved': { color: 'bg-green-500', label: 'Approved' },
      'rejected': { color: 'bg-red-500', label: 'Rejected' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-500', label: status };
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-primary to-secondary border-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Chairman Dashboard</h2>
              <p className="text-white/90">View and filter all events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event List with Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Events
          </CardTitle>
          
          {/* Date Filter */}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="event-date">Select Date</Label>
              <Input
                id="event-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleFilter}
                className="bg-primary hover:bg-primary-hover"
              >
                Apply Filter
              </Button>
              <Button 
                onClick={handleClearFilter}
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No events found{selectedDate && " for the selected date"}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Hall</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.event_name}</TableCell>
                      <TableCell>{event.event_date}</TableCell>
                      <TableCell>
                        {event.start_time} - {event.end_time}
                      </TableCell>
                      <TableCell>{event.halls?.name || '—'}</TableCell>
                      <TableCell>{event.halls?.block || '—'}</TableCell>
                      <TableCell>{event.department}</TableCell>
                      <TableCell>{event.faculty_name}</TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChairmanDashboard;
