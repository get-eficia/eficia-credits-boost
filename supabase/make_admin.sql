-- =====================================================
-- MAKE USER ADMIN
-- =====================================================
-- Quick script to promote a user to admin
-- Replace 'your-email@example.com' with the actual email
-- =====================================================

-- Step 1: Update the profile
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'g.darroux@gmail.com';

-- Step 2: Update auth metadata (done automatically by trigger)
-- But we can verify it:
SELECT
  u.email,
  p.is_admin as profile_admin,
  (u.raw_app_meta_data->>'is_admin')::boolean as auth_admin
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id
WHERE u.email = 'g.darroux@gmail.com';

-- =====================================================
-- Expected result:
-- email: g.darroux@gmail.com
-- profile_admin: true
-- auth_admin: true
-- =====================================================
