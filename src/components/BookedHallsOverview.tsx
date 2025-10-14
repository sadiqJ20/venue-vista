import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useBookedHalls } from "@/hooks/useBookedHalls";

const toTodayYMD = () => {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().split('T')[0];
}

const BookedHallsOverview = () => {
  const [date, setDate] = useState<string>(toTodayYMD());
  const { bookedHalls, loading, refresh } = useBookedHalls(date);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Booked Halls Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : bookedHalls.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No events found for this date</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hall Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Faculty Name</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Event Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookedHalls.map(b => (
                <TableRow key={b.id}>
                  <TableCell>{b.hall_name}</TableCell>
                  <TableCell>{b.department ?? '—'}</TableCell>
                  <TableCell>{b.faculty_name ?? '—'}</TableCell>
                  <TableCell>{b.event_date}</TableCell>
                  <TableCell>{b.start_time} — {b.end_time}</TableCell>
                  <TableCell className="max-w-xl truncate">{b.event_name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BookedHallsOverview;
