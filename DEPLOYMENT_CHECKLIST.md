# 🚀 Deployment Checklist - Eficia Credits Boost

Complete checklist for deploying the application to production.

---

## 📋 Pre-Deployment

### Database Setup

- [ ] Run main migration: `supabase/migrations/20241203_setup_auth_triggers.sql`
- [ ] Run RLS fix: `supabase/migrations/fix_rls_recursion.sql`
- [ ] Run verification: `supabase/migrations/verify_setup.sql`
- [ ] All checks show ✓ PASS

### Storage Setup

- [ ] Create bucket `enrich-uploads` (Private)
- [ ] Add storage policies (see `QUICKSTART.md`)
- [ ] Test file upload
- [ ] Test file download

### Admin User Setup

- [ ] Update email in `make_admin.sql`
- [ ] Run `make_admin.sql` to promote admin user
- [ ] Verify admin status:
  ```sql
  SELECT email, is_admin,
    (SELECT raw_app_meta_data->>'is_admin' FROM auth.users WHERE id = user_id) as auth_admin
  FROM profiles WHERE email = 'your@email.com';
  ```
- [ ] Logout and login to get new JWT token
- [ ] Verify admin dashboard access

---

## 📧 Email Notifications Setup

### Resend Configuration

- [ ] Create Resend account: https://resend.com
- [ ] Verify domain: `eficia.agency`
  - [ ] Add DNS records
  - [ ] Wait for verification (~5-10 min)
  - [ ] Check status in Resend dashboard
- [ ] Create API key
- [ ] Copy API key (starts with `re_...`)

### Edge Function Deployment

Option A - Automated:
```bash
./supabase/deploy-notifications.sh
```

Option B - Manual:
```bash
# 1. Login
supabase login

# 2. Link project
supabase link --project-ref olzzcjkcavsqxedrjtpd

# 3. Set secret
supabase secrets set RESEND_API_KEY=re_your_key_here

# 4. Deploy
supabase functions deploy notify-admin-new-job
```

- [ ] Edge function deployed
- [ ] `RESEND_API_KEY` secret set
- [ ] Function appears in Supabase dashboard

### Testing Email Notifications

- [ ] Create test non-admin user
- [ ] Upload test CSV file
- [ ] Admin receives email
- [ ] Email contains correct information
- [ ] Download link works (7-day validity)
- [ ] Dashboard link works

---

## 🌐 Frontend Deployment

### Environment Variables

- [ ] Copy `.env.example` to `.env`
- [ ] Set `VITE_SUPABASE_URL`
- [ ] Set `VITE_SUPABASE_ANON_KEY`

### Build and Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview build locally
npm run preview

# Deploy to hosting (Vercel/Netlify/etc)
```

- [ ] Build successful (no TypeScript errors)
- [ ] Preview works locally
- [ ] Deploy to hosting platform
- [ ] Production URL accessible

---

## ✅ Post-Deployment Testing

### Authentication Flow

- [ ] User can sign up
- [ ] Profile created automatically (trigger)
- [ ] Credit account created (balance = 0)
- [ ] Billing profile created
- [ ] User can sign in
- [ ] User can reset password
- [ ] Email confirmation works

### User Dashboard

- [ ] Dashboard loads correctly
- [ ] Credit balance displayed
- [ ] File upload works
- [ ] Drag & drop works
- [ ] CSV/Excel validation works
- [ ] Upload progress shown
- [ ] Success message shown
- [ ] Job appears in history

### Admin Dashboard

- [ ] Admin can access `/admin`
- [ ] Non-admin redirected to `/app`
- [ ] All jobs displayed
- [ ] User emails shown
- [ ] Job editing works
- [ ] Status update works
- [ ] File upload (enriched) works
- [ ] Credit deduction works
- [ ] Transaction created

### Email Notifications

- [ ] Non-admin upload triggers email
- [ ] Admin receives email
- [ ] Email format correct
- [ ] User info accurate
- [ ] Download link works
- [ ] Dashboard link works
- [ ] Admin upload does NOT trigger email

### Pricing

- [ ] 8 credit packs displayed
- [ ] Correct pricing shown
- [ ] Degressive pricing (0.29€ → 0.12€)
- [ ] Savings percentage shown
- [ ] "Most Popular" badge on 500 pack
- [ ] Pack names displayed correctly

---

## 🔍 Monitoring Setup

### Supabase Monitoring

- [ ] Enable email notifications for errors
- [ ] Monitor Edge Function logs
- [ ] Monitor Database logs
- [ ] Set up usage alerts

### Resend Monitoring

- [ ] Check email delivery rate
- [ ] Monitor bounces
- [ ] Check spam complaints
- [ ] Verify domain reputation

### Application Monitoring

- [ ] Set up error tracking (Sentry/etc)
- [ ] Monitor API response times
- [ ] Track user signups
- [ ] Monitor file uploads
- [ ] Track credit purchases (when implemented)

---

## 📊 Database Checks

### Tables Verification

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: billing_profiles, credit_accounts, credit_packs,
--           credit_transactions, enrich_jobs, profiles
```

### Triggers Verification

```sql
-- Check all triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
ORDER BY trigger_name;

-- Expected: on_auth_user_created, sync_admin_metadata,
--           set_updated_at_* (multiple)
```

### RLS Policies Verification

```sql
-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should have rowsecurity = true

-- Check policy count
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

-- Should be >= 10
```

### Credit Packs Verification

```sql
-- Check 8 packs exist
SELECT name, credits, price, price_per_credit, is_popular
FROM credit_packs
WHERE is_active = true
ORDER BY credits;

-- Should return 8 rows (Starter to Corporate)
```

---

## 🔐 Security Checks

### API Keys

- [ ] Supabase keys not committed to git
- [ ] `.env` in `.gitignore`
- [ ] Resend API key secure
- [ ] Service role key never exposed to frontend

### RLS Policies

- [ ] Users can only see own data
- [ ] Admins can see all data
- [ ] Admin check uses JWT metadata (no recursion)
- [ ] Storage policies correct

### Authentication

- [ ] Email verification enabled
- [ ] Password requirements enforced (min 6 chars)
- [ ] JWT expiry configured
- [ ] Refresh tokens work

---

## 📱 Browser Testing

### Desktop

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive design works

### Features to Test

- [ ] File drag & drop
- [ ] Modal dialogs
- [ ] Form validation
- [ ] Toast notifications
- [ ] Navigation
- [ ] Loading states

---

## 🚨 Rollback Plan

If deployment fails:

1. **Database Issues**:
   - Don't run new migrations
   - Fix issues locally first
   - Test with `verify_setup.sql`

2. **Edge Function Issues**:
   - Check logs: Supabase → Edge Functions → Logs
   - Redeploy previous version
   - Verify environment variables

3. **Frontend Issues**:
   - Revert to previous deployment
   - Check browser console
   - Fix and redeploy

---

## 📞 Support Contacts

- **Supabase Support**: https://supabase.com/support
- **Resend Support**: https://resend.com/support
- **GitHub Issues**: Create issue in your repo

---

## 📚 Documentation Links

- **Setup Guide**: `supabase/SETUP_INSTRUCTIONS.md`
- **Quick Start**: `supabase/QUICKSTART.md`
- **Email Setup**: `supabase/ADMIN_NOTIFICATIONS_SETUP.md`
- **Notifications Quick**: `NOTIFICATIONS_README.md`
- **Changelog**: `supabase/CHANGELOG.md`

---

## ✅ Final Checklist

Before going live:

- [ ] All database tables created
- [ ] All triggers active
- [ ] All RLS policies configured
- [ ] Storage bucket configured
- [ ] At least one admin user
- [ ] Credit packs inserted (8 packs)
- [ ] Edge function deployed
- [ ] Email notifications working
- [ ] Frontend deployed
- [ ] All tests passed
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team notified

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Production URL**: _______________

**Notes**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
