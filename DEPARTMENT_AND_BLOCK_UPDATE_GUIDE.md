# Department and Block Update Guide

## Overview
This guide explains how to add the new departments and Innovation Block to the Venue Vista system.

## Changes Made

### 1. New Departments Added
The following departments have been added to the system:
- MCA
- MBA  
- TRAINING
- PLACEMENT
- SCIENCE & HUMANITIES
- HR
- INNOVATION
- AI_ML

### 2. New Innovation Block Added
- **Block Name**: Innovation Block
- **Rooms**: 2 Smart Classrooms
  - Innovation Smart Classroom 1 (Capacity: 70)
  - Innovation Smart Classroom 2 (Capacity: 70)
- **Features**: AC, Microphone, Projector (Audio System: No)

## Files Modified

### Database Migration
- `supabase/migrations/20250127000000_add_new_departments_and_innovation_block.sql`

### TypeScript Types
- `src/hooks/useAuth.tsx` - Updated Department type
- `src/pages/Auth.tsx` - Updated Department type and departments array
- `src/integrations/supabase/types.ts` - Updated database types with new enums

## How to Apply the Changes

### Step 1: Run the Database Migration
```bash
cd venue-vista
npx supabase db push
```

Or if you're using Supabase CLI locally:
```bash
cd venue-vista
npx supabase migration up
```

### Step 2: Verify the Changes
After running the migration, you can verify the changes by:

1. **Check Departments**: The new departments should appear in the registration/login dropdowns
2. **Check Innovation Block**: The Innovation Block should appear in hall listings with 2 smart classrooms
3. **Test Booking**: Try creating a booking with one of the new departments or Innovation Block halls

### Step 3: Test the System
1. **User Registration**: Try registering with one of the new departments
2. **Hall Booking**: Try booking one of the Innovation Block smart classrooms
3. **Department Filtering**: Verify that HOD dashboards show bookings for new departments

## Database Schema Changes

### Enum Updates
- `department_name` enum now includes all new departments
- `block_name` enum now includes 'Innovation Block'

### New Hall Records
Two new hall records have been inserted:
```sql
INSERT INTO public.halls (name, block, type, capacity, has_ac, has_mic, has_projector, has_audio_system)
VALUES 
('Innovation Smart Classroom 1', 'Innovation Block', 'Smart Classroom', 70, true, true, true, false),
('Innovation Smart Classroom 2', 'Innovation Block', 'Smart Classroom', 70, true, true, true, false);
```

## Important Notes

1. **Existing Workflow Unchanged**: All existing booking, approval, and email workflows remain unchanged
2. **Backward Compatibility**: Existing users and bookings are not affected
3. **Type Safety**: All TypeScript types have been updated to include the new values
4. **UI Updates**: The new departments will automatically appear in all department dropdowns throughout the application

## Troubleshooting

### If Migration Fails
1. Check if Supabase is running: `npx supabase status`
2. Ensure you have the latest schema: `npx supabase db pull`
3. Check for any conflicting enum values

### If New Departments Don't Appear
1. Verify the migration ran successfully
2. Check browser cache - try hard refresh (Ctrl+F5)
3. Ensure the TypeScript types were updated correctly

### If Innovation Block Halls Don't Appear
1. Check the halls table: `SELECT * FROM halls WHERE block = 'Innovation Block'`
2. Verify the block_name enum was updated
3. Check if the INSERT statements executed successfully

## Verification Queries

Run these queries in your Supabase SQL editor to verify the changes:

```sql
-- Check new departments
SELECT unnest(enum_range(NULL::department_name)) as departments;

-- Check new blocks  
SELECT unnest(enum_range(NULL::block_name)) as blocks;

-- Check Innovation Block halls
SELECT * FROM halls WHERE block = 'Innovation Block';
```

## Support
If you encounter any issues, check the migration logs and ensure all dependencies are properly installed.
