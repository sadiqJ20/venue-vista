# Cross-Faculty Hall Availability System

## Overview
The hall booking system ensures that when ANY faculty member books a hall for a specific time range, that hall becomes unavailable for ALL other faculty members during that time period.

## How It Works

### 1. **Global Booking Fetch**
```typescript
// Fetches ALL bookings regardless of faculty
const { data: bookingsData } = await supabase
  .from('bookings')
  .select('hall_id, event_name, faculty_name, event_date, start_time, end_time, status')
  .gte('event_date', today)
  .in('status', ['approved', 'pending_hod', 'pending_principal', 'pending_pro']);
```

### 2. **Hall-Specific Availability Check**
For each hall, the system:
- Finds ALL bookings for that specific hall (regardless of which faculty made them)
- Checks if there's a current booking happening RIGHT NOW
- Determines availability based on whether ANY faculty has booked the hall

### 3. **Time-Based Logic**
```typescript
const currentBooking = hallBookings.find(booking => {
  // Must be for today
  if (booking.event_date !== today) return false;
  
  // Check if current time is within the booking time range
  const bookingStartTime = booking.start_time;
  const bookingEndTime = booking.end_time;
  
  return currentTime >= bookingStartTime && currentTime <= bookingEndTime;
});

// Hall is available if there's no current booking happening right now
const isCurrentlyAvailable = !currentBooking;
```

## Key Features

### ✅ **Cross-Faculty Visibility**
- When Faculty A books Hall 1 from 9-11 AM, Hall 1 disappears from "Available Halls" for ALL faculty
- Faculty B, C, D, etc. all see Hall 1 as "Booked" during 9-11 AM
- No faculty can book Hall 1 during that time period

### ✅ **Independent Hall Management**
- Booking Hall A doesn't affect Hall B's availability
- Each hall is processed independently
- Multiple halls can be booked simultaneously by different faculty

### ✅ **Real-Time Updates**
- Halls automatically switch from "booked" to "available" when booking ends
- Updates every minute to reflect current status
- All faculty see the same real-time availability

### ✅ **Overlap Prevention**
- Database triggers prevent overlapping bookings
- Frontend validation provides immediate feedback
- System rejects conflicting time slots for any faculty

## Example Scenarios

### Scenario 1: Cross-Faculty Booking
1. **Faculty A** books Hall 1 from 10:00-11:00 AM
2. **Faculty B** tries to book Hall 1 from 10:30-11:30 AM
3. **Result**: Faculty B's booking is rejected due to overlap
4. **All Faculty**: See Hall 1 as "Booked" from 10:00-11:00 AM

### Scenario 2: Multiple Halls
1. **Faculty A** books Hall 1 from 10:00-11:00 AM
2. **Faculty B** books Hall 2 from 10:00-11:00 AM
3. **Result**: Both bookings succeed
4. **All Faculty**: See Hall 1 as "Booked", Hall 2 as "Booked"

### Scenario 3: Time Release
1. **Faculty A** books Hall 1 from 10:00-11:00 AM
2. **Time**: 11:00 AM passes
3. **Result**: Hall 1 automatically becomes available
4. **All Faculty**: Can now book Hall 1 again

## Testing

### Console Debug Information
The system logs detailed information for troubleshooting:
```javascript
console.log('All bookings fetched (cross-faculty):', bookingsData);
console.log('Bookings by faculty:', facultyCounts);
console.log(`Hall ${hall.name}:`, {
  currentBooking: { faculty: 'Faculty Name', time: '10:00-11:00' },
  isCurrentlyAvailable: false
});
```

### Test Components
- **HallAvailabilityTest**: Comprehensive testing interface
- **Cross-Faculty Test**: Specifically tests cross-faculty scenarios
- **Real-Time Monitoring**: Watch halls change status as time passes

## Database Functions

### `is_hall_available()`
Checks if a hall is available for a specific time range, considering ALL bookings regardless of faculty.

### `check_hall_availability()`
Database trigger that prevents overlapping bookings for the same hall.

## Files Modified
- `src/hooks/useHallAvailability.tsx` - Core availability logic
- `src/components/HallSwitchDialog.tsx` - Fixed function call
- `src/components/HallAvailabilityTest.tsx` - Enhanced testing
- `src/components/HallStatusWidget.tsx` - Better status display

## Verification
To verify the system is working correctly:
1. Check console logs for cross-faculty booking information
2. Use the test components to simulate different scenarios
3. Monitor real-time availability updates
4. Confirm that booked halls disappear from all faculty views

