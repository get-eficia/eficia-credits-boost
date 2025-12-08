-- =====================================================
-- DISABLE handle_new_user TRIGGER
-- =====================================================
-- Now that we use the complete-signup Edge Function to create
-- profiles with ALL data (including billing) in one go,
-- we don't need the trigger anymore.
-- =====================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Optionally keep the function for backup, or drop it too
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- DONE!
-- =====================================================
-- Now the complete-signup Edge Function is the ONLY way
-- to create profiles, and it creates them with ALL data
-- in a single INSERT (no more UPSERT needed).
-- =====================================================
