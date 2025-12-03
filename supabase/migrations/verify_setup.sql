-- =====================================================
-- VERIFICATION SCRIPT
-- =====================================================
-- Run this after executing the main migration to verify
-- that everything is set up correctly.
-- =====================================================

\echo '========================================='
\echo 'EFICIA CREDITS BOOST - SETUP VERIFICATION'
\echo '========================================='
\echo ''

-- =====================================================
-- 1. CHECK TABLES EXIST
-- =====================================================
\echo '1. Checking if all tables exist...'
SELECT
  CASE
    WHEN COUNT(*) = 6 THEN '✓ All 6 tables exist'
    ELSE '✗ Missing tables! Found: ' || COUNT(*)::text
  END as table_check
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'billing_profiles',
    'credit_accounts',
    'credit_packs',
    'credit_transactions',
    'enrich_jobs'
  );

\echo ''
\echo 'Table details:'
SELECT
  table_name,
  '✓' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'billing_profiles',
    'credit_accounts',
    'credit_packs',
    'credit_transactions',
    'enrich_jobs'
  )
ORDER BY table_name;

-- =====================================================
-- 2. CHECK TRIGGERS
-- =====================================================
\echo ''
\echo '2. Checking triggers...'
SELECT
  trigger_name,
  event_object_table as on_table,
  action_timing || ' ' || event_manipulation as timing,
  '✓' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  OR (trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created')
ORDER BY trigger_name;

-- =====================================================
-- 3. CHECK RLS POLICIES
-- =====================================================
\echo ''
\echo '3. Checking RLS policies...'
SELECT
  schemaname,
  tablename,
  policyname,
  '✓' as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo 'RLS Status per table:'
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'billing_profiles',
    'credit_accounts',
    'credit_packs',
    'credit_transactions',
    'enrich_jobs'
  )
ORDER BY tablename;

-- =====================================================
-- 4. CHECK INDEXES
-- =====================================================
\echo ''
\echo '4. Checking performance indexes...'
SELECT
  schemaname,
  tablename,
  indexname,
  '✓' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- 5. CHECK CREDIT PACKS
-- =====================================================
\echo ''
\echo '5. Checking default credit packs...'
SELECT
  name,
  credits,
  price,
  price_per_credit,
  CASE WHEN is_popular THEN '★ Popular' ELSE '' END as popular,
  CASE WHEN is_active THEN '✓ Active' ELSE '✗ Inactive' END as status
FROM public.credit_packs
ORDER BY credits;

-- =====================================================
-- 6. CHECK FUNCTIONS
-- =====================================================
\echo ''
\echo '6. Checking trigger functions...'
SELECT
  proname as function_name,
  pg_get_function_result(oid) as returns,
  '✓' as status
FROM pg_proc
WHERE proname IN ('handle_new_user', 'handle_updated_at')
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- =====================================================
-- 7. CHECK TABLE RELATIONSHIPS
-- =====================================================
\echo ''
\echo '7. Checking foreign key constraints...'
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✓' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 8. SUMMARY
-- =====================================================
\echo ''
\echo '========================================='
\echo 'SUMMARY'
\echo '========================================='

WITH checks AS (
  SELECT 'Tables' as check_name,
    CASE WHEN COUNT(*) = 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'billing_profiles', 'credit_accounts', 'credit_packs', 'credit_transactions', 'enrich_jobs')

  UNION ALL

  SELECT 'Triggers' as check_name,
    CASE WHEN COUNT(*) >= 4 THEN '✓ PASS' ELSE '✗ FAIL' END as status
  FROM information_schema.triggers
  WHERE trigger_schema IN ('public', 'auth')

  UNION ALL

  SELECT 'RLS Policies' as check_name,
    CASE WHEN COUNT(*) >= 10 THEN '✓ PASS' ELSE '✗ FAIL' END as status
  FROM pg_policies
  WHERE schemaname = 'public'

  UNION ALL

  SELECT 'Credit Packs' as check_name,
    CASE WHEN COUNT(*) = 8 THEN '✓ PASS' ELSE '✗ FAIL' END as status
  FROM public.credit_packs

  UNION ALL

  SELECT 'Indexes' as check_name,
    CASE WHEN COUNT(*) >= 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname LIKE 'idx_%'

  UNION ALL

  SELECT 'Functions' as check_name,
    CASE WHEN COUNT(*) = 2 THEN '✓ PASS' ELSE '✗ FAIL' END as status
  FROM pg_proc
  WHERE proname IN ('handle_new_user', 'handle_updated_at')
    AND pronamespace = 'public'::regnamespace
)
SELECT check_name, status FROM checks;

\echo ''
\echo '========================================='
\echo 'If all checks show ✓ PASS, your setup is complete!'
\echo 'If any checks show ✗ FAIL, review the details above.'
\echo '========================================='
