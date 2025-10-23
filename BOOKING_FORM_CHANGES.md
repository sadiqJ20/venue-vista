# Booking Form Changes - Attendees Validation Enhancement

## Summary
Updated the booking form to enforce hall capacity limits on attendees and removed increment/decrement arrows from number inputs.

## Changes Made

### 1. Frontend UI Changes (`src/index.css`)
- Added `.no-spinner` CSS utility class to hide increment/decrement arrows on number inputs
- Supports Chrome, Safari, Edge, Opera, and Firefox browsers

### 2. Frontend Form Component (`src/components/BookingForm.tsx`)

#### Number Input Styling
- Applied `className="no-spinner"` to both:
  - **Number of Attendees** input field
  - **Number of Guest Lecturers** input field
- Removes the up/down arrow controls for cleaner UI

#### Attendees Count Validation
- **Initial Value**: Changed from `0` to `1` (enforces minimum from start)
- **Label Update**: Shows hall capacity dynamically: `"No. of Attendees (Max: {hall.capacity})"`
- **Input Constraints**:
  - `min={1}` - Minimum 1 attendee required
  - `max={hall.capacity}` - Maximum limited to hall's physical capacity
- **onChange Handler**: Clamps value between 1 and hall capacity:
  ```typescript
  onChange={(e) => {
    const value = parseInt(e.target.value) || 1;
    const clampedValue = Math.min(Math.max(1, value), hall.capacity);
    setFormData({ ...formData, attendeesCount: clampedValue });
  }}
  ```

#### Validation Logic Enhancement
Added capacity check in `validateForm()` function:
```typescript
if (formData.attendeesCount > hall.capacity) {
  toast({ 
    title: "Exceeds hall capacity", 
    description: `Number of attendees (${formData.attendeesCount}) exceeds the hall capacity of ${hall.capacity}. Please select a larger hall or reduce attendees.`, 
    variant: "destructive" 
  });
  return false;
}
```

### 3. Backend Database Validation (`supabase/migrations/20251023000000_add_capacity_validation.sql`)

#### Database Constraint
Created a trigger-based validation function that enforces:
- **Minimum**: Attendees count must be at least 1
- **Maximum**: Attendees count cannot exceed selected hall's capacity
- **Triggers**:
  - Fires on INSERT of new bookings
  - Fires on UPDATE of `attendees_count` or `hall_id` fields

#### Benefits
- Prevents invalid data even if frontend validation is bypassed
- Ensures data integrity at the database level
- Provides clear error messages on violation

## Validation Flow

### Frontend Validation (User Experience)
1. Input field prevents entering values < 1 or > hall.capacity
2. Real-time clamping ensures valid range as user types
3. Form submission validates before API call
4. User sees friendly toast notification if invalid

### Backend Validation (Data Integrity)
1. Database trigger validates on INSERT/UPDATE
2. Throws exception if constraint violated
3. Transaction is rolled back
4. Error message returned to frontend

## Testing Checklist

- [ ] Number inputs show no increment/decrement arrows
- [ ] Attendees field starts with value of 1
- [ ] Cannot enter attendees < 1 (UI prevents it)
- [ ] Cannot enter attendees > hall capacity (UI prevents it)
- [ ] Validation message shows when trying to exceed capacity
- [ ] Form submission is blocked if attendees exceed capacity
- [ ] Guest Lecturers field has no arrows (can still be 0 or more)
- [ ] Database migration applied successfully
- [ ] Backend rejects bookings with invalid attendee counts
- [ ] All other booking form features work normally

## Files Modified

1. `src/index.css` - Added `.no-spinner` utility class
2. `src/components/BookingForm.tsx` - Updated input fields and validation
3. `supabase/migrations/20251023000000_add_capacity_validation.sql` - New migration file

## Migration Instructions

To apply the database changes:
```bash
# If using Supabase CLI locally
supabase db reset

# Or deploy the specific migration
supabase migration up
```

## Notes

- No breaking changes to existing functionality
- All existing validations (time window, date, phone, etc.) remain intact
- UI/UX improvements maintain current styling and layout
- Backend validation provides an additional safety layer
