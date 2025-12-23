# 📧 Admin Notifications Setup Guide

This guide explains how to set up email notifications for admins when users upload new files.

## 🎯 Overview

When a non-admin user uploads a file for enrichment:
1. The file is uploaded to Supabase Storage
2. A job entry is created in `enrich_jobs` table
3. The Edge Function `notify-admin-new-job` is called
4. All admins receive an email with:
   - User information (name, email, phone, company)
   - File name
   - Direct download link (valid for 7 days)
   - Link to admin dashboard

---

## 📋 Prerequisites

1. **Supabase Project**: Already configured
2. **Resend Account**: Free account at [resend.com](https://resend.com)
3. **Domain Verification**: Your domain verified in Resend (eficia.agency)

---

## 🚀 Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email
3. Add and verify your domain `eficia.agency`:
   - Go to **Domains** → **Add Domain**
   - Enter `eficia.agency`
   - Add the DNS records provided by Resend to your domain registrar
   - Wait for verification (usually 5-10 minutes)

---

## 🔑 Step 2: Get Resend API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name: `Eficia Credits Boost Production`
4. Copy the API key (starts with `re_...`)

---

## ⚙️ Step 3: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref olzzcjkcavsqxedrjtpd

# Set environment variables
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Deploy the function
supabase functions deploy notify-admin-new-job
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **Create a new function**
3. Name: `notify-admin-new-job`
4. Copy the content from `supabase/functions/notify-admin-new-job/index.ts`
5. Paste into the function editor
6. Click **Deploy**

---

## 🔐 Step 4: Configure Environment Variables

In Supabase Dashboard:

1. Go to **Settings** → **Edge Functions**
2. Click **Manage secrets**
3. Add the following secret:
   - Key: `RESEND_API_KEY`
   - Value: `re_your_actual_api_key_here`
4. Click **Save**

The function will automatically have access to:
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

---

## 🧪 Step 5: Test the Notification

### Test via Dashboard

1. Sign up as a regular user (non-admin)
2. Upload a test CSV file
3. Check:
   - Admin email inbox for notification
   - Supabase **Edge Functions** → **Logs** for execution details

### Test via API

```bash
curl -X POST 'https://olzzcjkcavsqxedrjtpd.supabase.co/functions/v1/notify-admin-new-job' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "jobId": "test-job-id",
    "userId": "test-user-id",
    "filename": "test.csv",
    "filePath": "uploads/test-user-id/test.csv"
  }'
```

---

## 📊 Step 6: Verify Setup

Check the following:

### ✅ Edge Function Deployed
```bash
supabase functions list
```

Should show:
```
notify-admin-new-job
create-checkout
stripe-webhook
```

### ✅ Environment Variables Set
In Supabase Dashboard → Settings → Edge Functions → Secrets

Should show:
- `RESEND_API_KEY` ✓

### ✅ Admin Users Exist
Run in Supabase SQL Editor:
```sql
SELECT email, is_admin FROM public.profiles WHERE is_admin = true;
```

Should return at least one admin user.

### ✅ Test Upload
1. Create a non-admin test user
2. Upload a file
3. Check admin email
4. Check Edge Function logs

---

## 🔧 Troubleshooting

### Email Not Received

1. **Check Resend Dashboard**:
   - Go to **Logs** to see if email was sent
   - Check for errors

2. **Check Edge Function Logs**:
   - Supabase Dashboard → Edge Functions → notify-admin-new-job → Logs
   - Look for error messages

3. **Verify Domain**:
   - Ensure `eficia.agency` is verified in Resend
   - Check DNS records are correct

4. **Check Spam Folder**:
   - Emails might be marked as spam initially

### Function Not Called

1. **Check Browser Console**:
   - Open DevTools → Console
   - Look for errors when uploading

2. **Verify User is Not Admin**:
   ```sql
   SELECT is_admin FROM public.profiles WHERE email = 'user@example.com';
   ```
   Should return `false` for test user

3. **Check Function URL**:
   - Verify the function is accessible
   - Test with curl command above

### Permission Errors

1. **Service Role Key**:
   - Ensure Edge Function has access to service role key
   - Check Supabase auto-provides it as environment variable

2. **RLS Policies**:
   - Admin queries use service role, so RLS should not block
   - Verify with `SUPABASE_SERVICE_ROLE_KEY`

---

## 📝 Email Template Customization

To customize the email template, edit:
`supabase/functions/notify-admin-new-job/index.ts`

Lines 85-154 contain the HTML email template.

After editing:
```bash
supabase functions deploy notify-admin-new-job
```

---

## 🎨 Email Template Variables

Available variables in the template:
- `adminFirstName`: Admin's first name
- `userName`: User's full name
- `profile.email`: User's email
- `userPhone`: User's phone number
- `companyName`: User's company name
- `payload.filename`: Uploaded filename
- `downloadUrl`: Signed URL to download the file (7 days validity)
- `dashboardUrl`: Link to admin dashboard

---

## 🔒 Security Considerations

1. **Signed URLs**:
   - Download links expire after 7 days
   - Generated with service role key (admin access)

2. **Admin Detection**:
   - Only non-admin uploads trigger notifications
   - Checked in frontend before calling function

3. **Email Content**:
   - No sensitive data in email (just metadata)
   - Download requires clicking link (not inline)

4. **Rate Limiting**:
   - Resend free tier: 100 emails/day
   - Consider upgrading for production

---

## 💰 Resend Pricing

- **Free Tier**: 100 emails/day, 3,000/month
- **Paid Plan**: $20/month for 50,000 emails/month

For production with many users, consider paid plan.

---

## 📊 Monitoring

### Edge Function Logs

Supabase Dashboard → Edge Functions → notify-admin-new-job → Logs

Shows:
- Function invocations
- Errors
- Execution time
- Payload data

### Resend Logs

Resend Dashboard → Logs

Shows:
- Email delivery status
- Opens and clicks (if enabled)
- Bounces and complaints

---

## 🔄 Alternative: Database Trigger (Advanced)

If you prefer automatic triggering via database instead of frontend:

1. Enable `pg_net` extension in Supabase
2. Run the migration: `supabase/migrations/add_admin_notification_trigger.sql`
3. This creates a trigger that calls the Edge Function automatically

**Note**: Frontend approach is more reliable and easier to debug.

---

## ✅ Setup Checklist

- [ ] Resend account created
- [ ] Domain `eficia.agency` verified in Resend
- [ ] Resend API key obtained
- [ ] Edge Function deployed
- [ ] `RESEND_API_KEY` secret set in Supabase
- [ ] At least one admin user exists
- [ ] Test upload successful
- [ ] Admin email received
- [ ] Email template customized (optional)
- [ ] Monitoring set up

---

## 🆘 Support

If you encounter issues:

1. Check Edge Function logs in Supabase
2. Check Resend logs for email delivery
3. Verify all environment variables are set
4. Test with curl command
5. Check admin user exists and is_admin = true

---

**Last updated**: 2024-12-05
**Edge Function**: notify-admin-new-job
**Resend Domain**: eficia.agency
