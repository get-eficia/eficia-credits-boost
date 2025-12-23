# Supabase Database Setup Instructions

## 📋 Overview

This guide will help you set up the database schema and triggers for the Eficia Credits Boost application.

## 🚀 Quick Setup

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `olzzcjkcavsqxedrjtpd`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Migration

1. Click **New Query**
2. Open the file: `supabase/migrations/20241203_setup_auth_triggers.sql`
3. Copy the entire content
4. Paste it into the SQL Editor
5. Click **Run** or press `Ctrl+Enter`

### Step 3: Verify Installation

#### Option A: Quick Visual Check

After running the migration, verify that everything is set up correctly:

1. Go to **Table Editor** in the Supabase Dashboard
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `billing_profiles`
   - ✅ `credit_accounts`
   - ✅ `credit_packs`
   - ✅ `credit_transactions`
   - ✅ `enrich_jobs`

3. Go to **Database** → **Triggers**
   - ✅ `on_auth_user_created` (on `auth.users`)
   - ✅ `set_updated_at_profiles` (on `profiles`)
   - ✅ `set_updated_at_billing` (on `billing_profiles`)
   - ✅ `set_updated_at_credits` (on `credit_accounts`)

#### Option B: Automated Verification (RECOMMENDED)

Run the verification script to automatically check everything:

1. Go to **SQL Editor** in the Supabase Dashboard
2. Click **New Query**
3. Open the file: `supabase/migrations/verify_setup.sql`
4. Copy and paste the entire content
5. Click **Run**

The script will check:
- ✅ All 6 tables created
- ✅ All 4 triggers active
- ✅ All 15+ RLS policies configured
- ✅ All 9 performance indexes created
- ✅ 8 credit packs inserted
- ✅ Foreign key relationships
- ✅ 2 trigger functions exist

You should see all checks with ✓ PASS status.

## 📊 What This Migration Does

### 1. Creates Tables

- **profiles**: Stores user information (name, email, phone, admin status)
- **billing_profiles**: Stores company billing information
- **credit_accounts**: Tracks user credit balance
- **credit_packs**: Defines available credit packages for purchase
- **credit_transactions**: Records all credit movements (purchases, deductions, refunds)
- **enrich_jobs**: Tracks file enrichment jobs

### 2. Sets Up Row Level Security (RLS)

All tables have RLS policies configured to ensure:
- Users can only access their own data
- Admins can view **and modify** all data
- Admins can create credit transactions
- Public users can view active credit packs

**Total**: 15+ security policies across 6 tables

### 3. Creates Automatic Triggers

- **Auto-create profile**: When a user signs up, automatically creates:
  - Profile with user information
  - Credit account with 0 balance
  - Error handling to prevent signup failures
- **Auto-update timestamps**: Automatically updates `updated_at` fields on record changes for:
  - Profiles
  - Billing profiles
  - Credit accounts

### 4. Inserts Default Data

- Creates 8 default credit packs with degressive pricing:
  - Starter: 50 numbers for €14.50 (€0.29/number)
  - Mini: 100 numbers for €27.00 (€0.27/number, save 7%)
  - Basic: 200 numbers for €50.00 (€0.25/number, save 14%)
  - Professional: 500 numbers for €110.00 (€0.22/number, save 24%) ⭐ Most Popular
  - Business: 1000 numbers for €190.00 (€0.19/number, save 34%)
  - Premium: 2500 numbers for €400.00 (€0.16/number, save 45%)
  - Enterprise: 5000 numbers for €700.00 (€0.14/number, save 52%)
  - Corporate: 10000 numbers for €1200.00 (€0.12/number, save 59%)

### 5. Creates Performance Indexes

- 9 indexes created for optimized queries:
  - Admin lookups
  - User data retrieval
  - Job status filtering
  - Transaction history
  - Billing profile access

## 🔐 Setting Up Storage

You also need to configure storage for file uploads:

### Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Bucket name: `enrich-uploads`
4. Set as **Private** (not public)
5. Click **Create Bucket**

### Set Storage Policies

Go to **Storage** → **enrich-uploads** → **Policies** and add:

**Policy 1: Users can upload to their own folder**
```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'enrich-uploads' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

**Policy 2: Users can read their own files**
```sql
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'enrich-uploads' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

**Policy 3: Admins can read all files**
```sql
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

## 👤 Creating an Admin User

To create an admin user:

1. Sign up normally through the app
2. Go to **Table Editor** → **profiles**
3. Find your user by email
4. Set `is_admin` to `TRUE`
5. Save

## 🧪 Testing the Setup

### Test User Registration

1. Go to your app: `http://localhost:5173/signup`
2. Fill in the registration form
3. Submit

Expected behavior:
- User account is created in `auth.users`
- Profile is automatically created in `profiles` (via trigger)
- Credit account is automatically created in `credit_accounts` (via trigger)
- Billing profile is created with the form data

### Verify in Database

After registration, check:

```sql
-- Check profile was created
SELECT * FROM public.profiles WHERE email = 'your-test-email@example.com';

-- Check credit account was created
SELECT * FROM public.credit_accounts
JOIN public.profiles ON profiles.user_id = credit_accounts.user_id
WHERE profiles.email = 'your-test-email@example.com';

-- Check billing profile
SELECT * FROM public.billing_profiles
JOIN public.profiles ON profiles.user_id = billing_profiles.user_id
WHERE profiles.email = 'your-test-email@example.com';
```

## 🐛 Troubleshooting

### Error: "relation already exists"

If you get errors about tables already existing:
- Check if you have existing tables
- Either drop them or modify the migration to use `CREATE TABLE IF NOT EXISTS`

### Error: "trigger already exists"

The migration includes `DROP TRIGGER IF EXISTS` statements, so this shouldn't happen. If it does:
```sql
DROP TRIGGER trigger_name ON table_name;
```

### Profile not created automatically

1. Check if the trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

2. Check trigger function:
```sql
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

3. Test trigger manually:
```sql
SELECT public.handle_new_user();
```

### RLS blocking access

If you can't access your own data:
1. Check you're authenticated: `SELECT auth.uid();`
2. Verify RLS policies: **Database** → **Tables** → Select table → **Policies**
3. Temporarily disable RLS for testing (not recommended for production):
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

## 📝 Environment Configuration

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://olzzcjkcavsqxedrjtpd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🔄 Updating the Schema

If you need to make changes later:

1. Create a new migration file: `supabase/migrations/YYYYMMDD_description.sql`
2. Test it in the SQL Editor first
3. Apply it to production when ready

## 📞 Support

If you encounter issues:
1. Check Supabase logs: **Database** → **Logs**
2. Check browser console for frontend errors
3. Verify RLS policies are correct
4. Ensure storage bucket is configured

## ✅ Checklist

Before going to production:

- [ ] All tables created
- [ ] All triggers active
- [ ] RLS policies configured
- [ ] Storage bucket created with policies
- [ ] At least one admin user created
- [ ] Default credit packs inserted
- [ ] Test user registration works
- [ ] Test file upload works
- [ ] Test admin dashboard access

---

**Last updated**: 2024-12-03
**Migration version**: 20241203_setup_auth_triggers
