# ✅ Admin Role - Testing Checklist

## 🎉 Database Setup Complete!
All database components are in place:
- ✅ Admin role added to enum
- ✅ Single admin constraint trigger active
- ✅ RLS policies created
- ✅ Admin function exists

## 🧪 Now Test the Application

### Test 1: Admin Registration (Most Important!)

1. **Start your dev server** (if not running):
   ```bash
   cd venue-vista
   npm run dev
   ```

2. **Open the app** in your browser (usually `http://localhost:8080` or `http://localhost:5173`)

3. **Navigate to Sign Up** (`/auth` tab → Sign Up)

4. **Select "Admin" from role dropdown**
   - ✅ Department field should be **HIDDEN**
   - ✅ Unique ID field should be **HIDDEN**
   - ✅ Info message should appear: "Admin accounts only require name, email, and password"

5. **Fill the form:**
   - Name: `Admin User`
   - Email: `admin@example.com` (use a real email)
   - Password: `password123` (or your choice)
   - Mobile: `1234567890` (exactly 10 digits)
   - Role: **Admin**

6. **Click "Create Account"**
   - ✅ Should succeed and show success message
   - ✅ If error appears, check the error message

### Test 2: Single Admin Constraint

1. **Try to register a SECOND admin:**
   - Use different email: `admin2@test.com`
   - Select "Admin" role
   - Submit
   - ✅ Should show error: **"Only one Admin account is allowed."**

### Test 3: Admin Login

1. **Go to Sign In tab** (in `/auth`)

2. **Select "Admin" from role dropdown**
   - ✅ Department field should be **HIDDEN**
   - ✅ Unique ID field should be **HIDDEN**

3. **Enter credentials:**
   - Email: `admin@example.com` (the one you just created)
   - Password: `password123`
   - Role: **Admin**

4. **Click "Sign In"**
   - ✅ Should login successfully
   - ✅ Should redirect to `/dashboard`
   - ✅ Should see "Administrator" in the header
   - ✅ Should see **Admin Dashboard** with user management table

### Test 4: Admin Dashboard Features

1. **Verify Statistics Cards:**
   - ✅ Total Users count
   - ✅ Faculty count
   - ✅ HODs count
   - ✅ Admins count (should show 1)

2. **Test Search:**
   - Type a name in search box
   - ✅ Users should filter

3. **Test Role Filter:**
   - Select "Faculty" from dropdown
   - ✅ Only faculty users shown
   - Select "All Roles"
   - ✅ All users shown

4. **Test User Deletion:**
   - Find a user (NOT yourself)
   - Click "Remove" button
   - Confirm deletion
   - ✅ User should be deleted
   - ✅ Success message shown

5. **Try to Delete Yourself:**
   - Look for your own account
   - ✅ Should show "Current User" badge instead of Remove button
   - ✅ Cannot delete yourself (safety feature)

## 🐛 Troubleshooting

### Issue: "Admin" not showing in dropdown
**Solution:** 
- Clear browser cache
- Restart dev server
- Check browser console for errors

### Issue: Registration fails with "Only one Admin account is allowed"
**Solution:** 
- An admin already exists
- Check: `SELECT * FROM profiles WHERE role = 'admin';` in SQL Editor
- If you want to create a new admin, delete the existing one first

### Issue: Admin dashboard not loading users
**Solution:**
- Check browser console (F12) for errors
- Verify RLS policies are working
- Check if you're logged in as admin

### Issue: Can't see other users
**Solution:**
- Verify RLS policy "Admin can view all profiles" exists
- Check if you're logged in with admin role

## ✅ Success Criteria

You'll know everything works when:
1. ✅ Can register admin (only one allowed)
2. ✅ Can login as admin
3. ✅ See admin dashboard with all users
4. ✅ Can filter and search users
5. ✅ Can delete users (except yourself)
6. ✅ Single admin constraint works

---

**Ready to test!** Start with Test 1 (Admin Registration) and work through each test step by step.

