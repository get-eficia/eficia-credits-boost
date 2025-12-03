# Supabase Database Configuration

This directory contains all database migrations, setup scripts, and documentation for the Eficia Credits Boost application.

## 📁 Directory Structure

```
supabase/
├── README.md                          # This file
├── QUICKSTART.md                      # 5-minute setup guide ⚡
├── SETUP_INSTRUCTIONS.md              # Detailed setup documentation 📚
├── CHANGELOG.md                       # Migration history and changes 📝
├── config.toml                        # Supabase project config
├── functions/                         # Edge functions
│   ├── create-checkout/
│   └── stripe-webhook/
└── migrations/
    ├── 20241203_setup_auth_triggers.sql  # Main database setup 🔧
    └── verify_setup.sql                  # Setup verification script ✅
```

## 🚀 Getting Started

**New to this project?** Start here:

1. **Quick Setup** (5 min): Read [QUICKSTART.md](QUICKSTART.md)
2. **Detailed Guide**: See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
3. **What Changed**: Check [CHANGELOG.md](CHANGELOG.md)

## 📋 Migration Files

### `20241203_setup_auth_triggers.sql` - Main Setup

**What it does:**
- Creates 6 database tables
- Sets up 15+ Row Level Security policies
- Creates automatic triggers for user creation
- Adds 9 performance indexes
- Inserts 4 default credit packs

**Status:** ✅ Production Ready

**To run:**
```sql
-- In Supabase SQL Editor
-- Copy content from 20241203_setup_auth_triggers.sql
-- Paste and execute
```

### `verify_setup.sql` - Verification Script

**What it does:**
- Checks all tables exist
- Verifies triggers are active
- Validates RLS policies
- Confirms indexes created
- Tests data integrity

**Status:** ✅ Recommended after migration

**To run:**
```sql
-- In Supabase SQL Editor
-- Copy content from verify_setup.sql
-- Paste and execute
-- All checks should show ✓ PASS
```

## 🗄️ Database Schema

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User information | Auto-created on signup, admin flag |
| `billing_profiles` | Company billing | Unique per user |
| `credit_accounts` | Credit balance | Auto-created with 0 balance |
| `credit_packs` | Available packages | 4 default packs |
| `credit_transactions` | Transaction log | Purchases, deductions, refunds |
| `enrich_jobs` | File enrichment jobs | Status tracking, admin notes |

### Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (user_id) ←─┐
    ↓                │
    ├── billing_profiles (user_id)
    ├── credit_accounts (user_id)
    │       ↓
    │       └── credit_transactions (credit_account_id)
    └── enrich_jobs (user_id)
```

## 🔒 Security

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- ✅ Users can only access their own data
- ✅ Admins have full access to all data
- ✅ Public users can view active credit packs

**Test RLS:**
```sql
-- As regular user (should see only your data)
SELECT * FROM profiles;

-- As admin (should see all data)
SELECT * FROM profiles WHERE is_admin = TRUE;
```

## ⚡ Performance

### Indexes Created

- `idx_profiles_admin` - Fast admin queries
- `idx_credit_accounts_user` - Quick balance lookups
- `idx_enrich_jobs_user` - User job history
- `idx_enrich_jobs_status` - Filter by status
- `idx_enrich_jobs_created` - Recent jobs
- `idx_credit_transactions_account` - Transaction history
- `idx_credit_transactions_created` - Recent transactions
- `idx_billing_profiles_user` - Billing lookups

**Expected query times:**
- User profile: < 1ms
- Credit balance: < 1ms
- Recent jobs: < 5ms
- Transaction history: < 10ms

## 🔧 Triggers

### `on_auth_user_created`

**When:** User signs up via Supabase Auth
**What:** Automatically creates:
1. Profile record
2. Credit account (balance: 0)

**Error handling:** Uses `ON CONFLICT DO NOTHING` and exception handling

### `set_updated_at_*`

**When:** Record is updated
**What:** Sets `updated_at` to current timestamp
**Tables:** profiles, billing_profiles, credit_accounts

## 📦 Edge Functions

### `create-checkout`
Purpose: Handle Stripe payment creation
Auth: JWT verification disabled

### `stripe-webhook`
Purpose: Process Stripe webhook events
Auth: JWT verification disabled

## 🧪 Testing

### Run All Checks

```sql
-- Execute verify_setup.sql in SQL Editor
-- Should show all ✓ PASS
```

### Test User Flow

1. Sign up: `http://localhost:5173/signup`
2. Check profile created:
```sql
SELECT * FROM profiles WHERE email = 'test@example.com';
```
3. Check credit account:
```sql
SELECT ca.* FROM credit_accounts ca
JOIN profiles p ON p.user_id = ca.user_id
WHERE p.email = 'test@example.com';
```

## 🐛 Troubleshooting

### Common Issues

**Issue:** Profile not created on signup
```sql
-- Check trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Issue:** RLS blocking access
```sql
-- Check current user
SELECT auth.uid(), auth.email();

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**Issue:** Slow queries
```sql
-- Check indexes exist
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

## 📚 Documentation

- **Quick Start**: [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- **Full Guide**: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Detailed instructions
- **Changes**: [CHANGELOG.md](CHANGELOG.md) - Migration history
- **Supabase Docs**: https://supabase.com/docs

## 🔗 Project Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/olzzcjkcavsqxedrjtpd
- **SQL Editor**: [Dashboard → SQL Editor](https://supabase.com/dashboard/project/olzzcjkcavsqxedrjtpd/sql)
- **Table Editor**: [Dashboard → Table Editor](https://supabase.com/dashboard/project/olzzcjkcavsqxedrjtpd/editor)
- **Storage**: [Dashboard → Storage](https://supabase.com/dashboard/project/olzzcjkcavsqxedrjtpd/storage/buckets)

## 🆘 Support

Need help?
1. Check [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) troubleshooting section
2. Review [CHANGELOG.md](CHANGELOG.md) for known issues
3. Check Supabase logs: Dashboard → Database → Logs

## ✅ Pre-Production Checklist

Before deploying to production:

- [ ] Run main migration
- [ ] Run verification script (all ✓ PASS)
- [ ] Create storage bucket with policies
- [ ] Create at least one admin user
- [ ] Test user registration flow
- [ ] Test file upload flow
- [ ] Test admin dashboard access
- [ ] Verify RLS policies work
- [ ] Check query performance
- [ ] Configure email templates
- [ ] Set up monitoring/alerts
- [ ] Backup database

---

**Last Updated**: 2024-12-03
**Database Version**: 1.0.0
**Migration**: 20241203_setup_auth_triggers
**Status**: ✅ Production Ready
