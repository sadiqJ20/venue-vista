# Admin Role Testing Guide

## ✅ Pre-Testing Checklist

1. **Database Migration Applied** ✓ (You've verified 'admin' is in the enum)
2. **Code Changes Applied** ✓ (All frontend and backend changes are in place)
3. **Dev Server Running** (Make sure `npm run dev` is running)

## 🧪 Testing Steps

### Test 1: Admin Registration

1. **Navigate to Sign Up page** (`/auth`)
2. **Select "Admin" from role dropdown**
   - ✅ Department field should be **hidden**
   - ✅ Unique ID field should be **hidden**
   - ✅ Info message should appear: "Admin accounts only require name, email, and password"
3. **Fill in the form:**
   - Name: `Test Admin`
   - Email: `admin@test.com`
   - Password: `password123`
   - Mobile: `1234567890`
   - Role: `Admin`
4. **Submit the form**
   - ✅ Should create account successfully
   - ✅ Should show success message

### Test 2: Single Admin Constraint

1. **Try to register a second admin**
   - Use different email: `admin2@test.com`
   - Select "Admin" role
   - Submit
   - ✅ Should show error: "Only one Admin account is allowed."

### Test 3: Admin Login

1. **Navigate to Sign In page** (`/auth`)
2. **Select "Admin" from role dropdown**
   - ✅ Department field should be **hidden**
   - ✅ Unique ID field should be **hidden**
3. **Enter credentials:**
   - Email: `admin@test.com`
   - Password: `password123`
   - Role: `Admin`
4. **Submit**
   - ✅ Should login successfully
   - ✅ Should redirect to `/dashboard`
   - ✅ Should see "Administrator" in the header
   - ✅ Should see Admin Dashboard with user management table

### Test 4: Admin Dashboard - View Users

1. **After logging in as admin, verify:**
   - ✅ Statistics cards show: Total Users, Faculty, HODs, Admins
   - ✅ User table displays: Name, Email, Department, Role
   - ✅ All users are visible (not just own profile)

### Test 5: Admin Dashboard - Filter Users

1. **Test role filter dropdown:**
   - Select "Faculty" → ✅ Only faculty users shown
   - Select "HOD" → ✅ Only HOD users shown
   - Select "Principal" → ✅ Only Principal users shown
   - Select "PRO" → ✅ Only PRO users shown
   - Select "All Roles" → ✅ All users shown

### Test 6: Admin Dashboard - Search Users

1. **Test search functionality:**
   - Type a name → ✅ Filtered by name
   - Type an email → ✅ Filtered by email
   - Type a department → ✅ Filtered by department

### Test 7: Admin Dashboard - Delete User

1. **Find a user (not yourself)**
2. **Click "Remove" button**
3. **Confirm deletion in dialog**
   - ✅ User should be deleted
   - ✅ Success message shown
   - ✅ User disappears from table
4. **Try to delete yourself:**
   - ✅ Should show "Cannot Delete" message: "You cannot delete your own account."
   - ✅ Remove button should show "Current User" badge

### Test 8: Non-Admin Access Restriction

1. **Log in as a different role (Faculty, HOD, etc.)**
2. **Try to access admin routes directly** (if any)
   - ✅ Should be restricted by RLS policies
   - ✅ Should not see admin dashboard

## 🔍 Troubleshooting

### Issue: "Admin" option not showing in dropdown
- **Solution**: Clear browser cache and restart dev server
- **Check**: Verify `types.ts` includes 'admin' in user_role enum

### Issue: "Only one Admin account is allowed" even when no admin exists
- **Solution**: Check if admin exists: `SELECT * FROM profiles WHERE role = 'admin';`
- **If exists**: Delete it first, then try again

### Issue: Admin dashboard not loading users
- **Solution**: Check browser console for errors
- **Verify**: RLS policies are applied correctly (run verification SQL)

### Issue: Cannot delete users
- **Solution**: Verify RLS policy "Admin can delete profiles" exists
- **Check**: Make sure you're logged in as admin

## 📝 Notes

- Admin cannot delete their own account (safety feature)
- Only ONE admin can exist in the system
- Admin has full access to view all users, bookings, and approvals
- Admin registration only requires: name, email, password, mobile

