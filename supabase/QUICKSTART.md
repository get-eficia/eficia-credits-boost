# 🚀 Quick Start Guide - Supabase Setup

## ⏱️ 5-Minute Setup

### Step 1: Run Main Migration (2 min)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Copy content from `supabase/migrations/20241203_setup_auth_triggers.sql`
3. Paste and click **Run**

### Step 2: Verify Setup (1 min)

1. In SQL Editor, click **New Query**
2. Copy content from `supabase/migrations/verify_setup.sql`
3. Paste and click **Run**
4. Check all items show ✓ PASS

### Step 3: Create Storage Bucket (2 min)

1. Go to **Storage** → **New Bucket**
2. Name: `enrich-uploads`
3. Type: Private
4. Add these 3 policies in SQL Editor:

```sql
-- Policy 1: Users upload to own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'enrich-uploads' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

-- Policy 2: Users read own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'enrich-uploads' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

-- Policy 3: Admins read all files
CREATE POLICY "Admins can read all files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'enrich-uploads' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = TRUE
  )
);
```

---

## ✅ Quick Verification Checklist

```sql
-- Check tables exist (should return 6)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'billing_profiles', 'credit_accounts',
                     'credit_packs', 'credit_transactions', 'enrich_jobs');

-- Check triggers exist (should return 4)
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth');

-- Check credit packs (should return 4)
SELECT COUNT(*) FROM public.credit_packs;
```

---

## 👤 Create Your First Admin

After signing up through the app:

```sql
-- Find your user
SELECT user_id, email FROM public.profiles WHERE email = 'your-email@example.com';

-- Set as admin
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

---

## 🧪 Test User Registration

1. Go to `http://localhost:5173/signup`
2. Fill form and submit
3. Verify in Supabase:

```sql
-- Check user was created correctly
SELECT
  p.email,
  p.first_name,
  p.last_name,
  p.is_admin,
  ca.balance as credits,
  bp.company_name
FROM public.profiles p
LEFT JOIN public.credit_accounts ca ON ca.user_id = p.user_id
LEFT JOIN public.billing_profiles bp ON bp.user_id = p.user_id
WHERE p.email = 'test@example.com';
```

Expected result:
- ✅ Profile created
- ✅ Credit account with balance = 0
- ✅ Billing profile with company info

---

## 🐛 Quick Troubleshooting

### Profile not created on signup?

```sql
-- Check trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Manually create for existing user
INSERT INTO public.profiles (user_id, email, first_name, last_name, is_admin)
SELECT id, email,
       raw_user_meta_data->>'first_name',
       raw_user_meta_data->>'last_name',
       FALSE
FROM auth.users
WHERE id = 'user-uuid-here'
ON CONFLICT DO NOTHING;

INSERT INTO public.credit_accounts (user_id, balance)
VALUES ('user-uuid-here', 0)
ON CONFLICT DO NOTHING;
```

### Can't access own data?

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check current user
SELECT auth.uid(), auth.email();

-- Temporarily disable RLS (testing only!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Storage upload fails?

```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE name = 'enrich-uploads';

-- Check storage policies (correct PostgreSQL query)
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: ' || pg_get_expr(qual, 'storage.objects'::regclass)
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || pg_get_expr(with_check, 'storage.objects'::regclass)
    ELSE 'No condition'
  END as policy_condition
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE '%enrich%'
ORDER BY policyname;
```

---

## 📊 Useful Queries

### View all users with their credits
```sql
SELECT
  p.email,
  p.first_name || ' ' || p.last_name as name,
  p.is_admin,
  ca.balance as credits,
  (SELECT COUNT(*) FROM enrich_jobs WHERE user_id = p.user_id) as jobs_count
FROM profiles p
LEFT JOIN credit_accounts ca ON ca.user_id = p.user_id
ORDER BY p.created_at DESC;
```

### View all credit packs
```sql
SELECT
  name,
  credits,
  price,
  price_per_credit,
  ROUND((1 - price_per_credit / 0.29) * 100) as discount_percent,
  CASE WHEN is_popular THEN '⭐ Popular' ELSE '' END as badge
FROM credit_packs
WHERE is_active = TRUE
ORDER BY credits;
```

### View recent transactions
```sql
SELECT
  p.email,
  ct.amount,
  ct.type,
  ct.description,
  ct.created_at
FROM credit_transactions ct
JOIN credit_accounts ca ON ca.id = ct.credit_account_id
JOIN profiles p ON p.user_id = ca.user_id
ORDER BY ct.created_at DESC
LIMIT 10;
```

### View job statistics
```sql
SELECT
  status,
  COUNT(*) as count,
  SUM(credited_numbers) as total_credits_used
FROM enrich_jobs
GROUP BY status;
```

---

## 🔗 Quick Links

- **Main Migration**: `supabase/migrations/20241203_setup_auth_triggers.sql`
- **Verification Script**: `supabase/migrations/verify_setup.sql`
- **Full Documentation**: `supabase/SETUP_INSTRUCTIONS.md`
- **Changelog**: `supabase/CHANGELOG.md`
- **Supabase Dashboard**: https://supabase.com/dashboard/project/olzzcjkcavsqxedrjtpd

---

## 💡 Pro Tips

1. **Always verify** after migration using `verify_setup.sql`
2. **Test locally** before production deployment
3. **Backup data** before running migrations on production
4. **Monitor logs** in Supabase Dashboard → Database → Logs
5. **Use indexes** - they're already created for you!

---

**Need help?** Check `SETUP_INSTRUCTIONS.md` for detailed troubleshooting.
