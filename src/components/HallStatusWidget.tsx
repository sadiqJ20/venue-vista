import React from 'react';
import { useHallAvailability } from '@/hooks/useHallAvailability';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const HallStatusWidget = () => {
  const { halls, loading } = useHallAvailability();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hall Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading hall status...</div>
        </CardContent>
      </Card>
    );
  }

  const availableHalls = halls.filter(hall => hall.isAvailable);
  const bookedHalls = halls.filter(hall => !hall.isAvailable);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Hall Status
          <div className="text-sm text-gray-500">
            {availableHalls.length} available, {bookedHalls.length} booked
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Available Halls */}
          {availableHalls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">Available Halls</h4>
              <div className="space-y-1">
                {availableHalls.map(hall => (
                  <div key={hall.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm">{hall.name} ({hall.block})</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Available
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booked Halls */}
          {bookedHalls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">Booked Halls</h4>
              <div className="space-y-1">
                {bookedHalls.map(hall => (
                  <div key={hall.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div className="flex-1">
                      <div className="text-sm">{hall.name} ({hall.block})</div>
                      {hall.currentBooking && (
                        <div className="text-xs text-red-600">
                          {hall.currentBooking.event_name} ({hall.currentBooking.start_time}-{hall.currentBooking.end_time})
                        </div>
                      )}
                      {hall.bookedUntil && !hall.currentBooking && (
                        <div className="text-xs text-orange-600">
                          Next booking until: {hall.bookedUntil}
                        </div>
                      )}
                    </div>
                    <Badge variant="destructive">
                      Booked
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {halls.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No halls found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HallStatusWidget;

