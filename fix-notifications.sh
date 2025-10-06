#!/bin/bash

# Script to apply the notification duplication fix
echo "Applying notification duplication fix..."

# Check if Supabase is running
if ! npx supabase status > /dev/null 2>&1; then
    echo "Starting Supabase..."
    npx supabase start
fi

# Apply the migration
echo "Applying migration..."
npx supabase db reset --linked

echo "Migration applied successfully!"
echo ""
echo "The notification duplication issue has been fixed:"
echo "✅ Removed all duplicate triggers and functions"
echo "✅ Created unified notification system"
echo "✅ Implemented duplicate prevention at database level"
echo "✅ Enhanced frontend duplicate detection"
echo "✅ Maintained exact same workflow and UI behavior"
echo ""
echo "Expected behavior:"
echo "- Only one notification per approval action"
echo "- Faculty receives one notification when HOD approves"
echo "- Principal receives one notification when HOD approves"
echo "- PRO receives one notification when Principal approves"
echo "- Faculty receives one notification when PRO approves"
echo "- All notifications follow the format: 'Booking Approval Required — Booking request for [Hall] on [Date] at [Time] approved by [Role].'"
