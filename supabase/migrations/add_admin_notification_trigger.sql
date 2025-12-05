-- =====================================================
-- ADD ADMIN NOTIFICATION ON FILE UPLOAD
-- =====================================================
-- This migration adds a trigger to notify admins
-- when a non-admin user uploads a new enrichment job
-- =====================================================

-- =====================================================
-- 1. CREATE FUNCTION TO CALL EDGE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_admins_new_job()
RETURNS TRIGGER AS $$
DECLARE
  user_is_admin BOOLEAN;
  function_url TEXT;
  request_id INT;
BEGIN
  -- Check if the user is an admin
  SELECT is_admin INTO user_is_admin
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Only notify if user is NOT an admin
  IF user_is_admin = FALSE THEN
    -- Build the edge function URL
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-admin-new-job';

    -- Call the edge function using pg_net (async)
    -- Note: You need to enable pg_net extension first
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'jobId', NEW.id,
        'userId', NEW.user_id,
        'filename', NEW.original_filename,
        'filePath', NEW.original_file_path
      )
    ) INTO request_id;

    RAISE NOTICE 'Admin notification triggered for job %, request_id: %', NEW.id, request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE TRIGGER ON ENRICH_JOBS INSERT
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notify_admins_new_job ON public.enrich_jobs;

CREATE TRIGGER trigger_notify_admins_new_job
  AFTER INSERT ON public.enrich_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_job();

-- =====================================================
-- 3. ENABLE pg_net EXTENSION (if not already enabled)
-- =====================================================

-- Note: pg_net might need to be enabled via Supabase Dashboard
-- Go to Database > Extensions and enable "pg_net"

-- Check if pg_net is available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    RAISE NOTICE 'pg_net extension not found. Please enable it in Supabase Dashboard > Database > Extensions';
  ELSE
    RAISE NOTICE 'pg_net extension is enabled';
  END IF;
END $$;

-- =====================================================
-- ALTERNATIVE: Using HTTP webhook (if pg_net not available)
-- =====================================================

-- If pg_net is not available, you can use supabase_functions.http_request
-- or call the edge function directly from the application code

COMMENT ON FUNCTION public.notify_admins_new_job() IS
'Triggers admin notification email when a non-admin user uploads a new enrichment job';

-- =====================================================
-- DONE!
-- =====================================================
-- When a non-admin user uploads a file:
-- 1. The trigger detects the new enrich_jobs row
-- 2. It calls the edge function notify-admin-new-job
-- 3. The edge function sends emails to all admins
-- =====================================================
