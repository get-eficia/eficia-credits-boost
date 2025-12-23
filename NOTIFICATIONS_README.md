# 📧 Admin Notifications - Quick Start

## What's Been Implemented

When a **non-admin user** uploads a file for enrichment, **all admin users** receive an automatic email notification with:

✅ User details (name, email, phone, company)
✅ Uploaded filename
✅ Direct download link (7-day validity)
✅ Quick link to admin dashboard
✅ Beautiful HTML email template

---

## 📁 Files Created

### Edge Function
- `supabase/functions/notify-admin-new-job/index.ts` - Main notification logic
- `supabase/functions/notify-admin-new-job/README.md` - Function documentation

### Frontend Integration
- Modified: `src/pages/Dashboard.tsx` - Calls edge function after upload

### Documentation
- `supabase/ADMIN_NOTIFICATIONS_SETUP.md` - Complete setup guide
- `supabase/deploy-notifications.sh` - One-command deployment script

### Database (Optional)
- `supabase/migrations/add_admin_notification_trigger.sql` - Alternative trigger-based approach

---

## 🚀 Quick Setup (5 minutes)

### 1. Create Resend Account
```bash
1. Go to https://resend.com
2. Sign up for free account
3. Verify your email
```

### 2. Verify Your Domain
```bash
1. In Resend, go to Domains → Add Domain
2. Enter: eficia.agency
3. Add the DNS records to your domain
4. Wait ~5 minutes for verification
```

### 3. Get API Key
```bash
1. In Resend, go to API Keys
2. Create new key: "Eficia Credits Boost"
3. Copy the key (starts with re_...)
```

### 4. Deploy
```bash
# Run the deployment script
./supabase/deploy-notifications.sh

# When prompted, paste your Resend API key
```

### 5. Test
```bash
1. Create a test non-admin user
2. Upload a CSV file
3. Check admin email inbox
```

---

## 🔧 Manual Deployment (Alternative)

If you prefer manual steps:

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref olzzcjkcavsqxedrjtpd

# 4. Set API key
supabase secrets set RESEND_API_KEY=re_your_key_here

# 5. Deploy function
supabase functions deploy notify-admin-new-job
```

---

## 📊 How It Works

```
User uploads file
       ↓
Dashboard.tsx detects upload
       ↓
Calls supabase.functions.invoke('notify-admin-new-job')
       ↓
Edge Function receives request
       ↓
Fetches user profile & billing info
       ↓
Finds all admin users
       ↓
Generates signed download URL (7 days)
       ↓
Sends email to each admin via Resend
       ↓
Admins receive beautiful HTML email
```

---

## 📧 Email Preview

**Subject**: 🔔 New File Upload: customer_data.csv

**From**: Eficia Credits Boost <noreply@eficia.agency>

**To**: admin@eficia.agency

**Content**:
- User name, email, phone, company
- Filename
- Download button (7-day link)
- Dashboard link
- Next steps instructions

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Edge function appears in Supabase Dashboard
- [ ] `RESEND_API_KEY` is set in Secrets
- [ ] Domain is verified in Resend
- [ ] At least one admin user exists (`is_admin = true`)
- [ ] Test upload triggers email
- [ ] Email arrives in admin inbox
- [ ] Download link works
- [ ] Dashboard link works

---

## 🔍 Monitoring

### Edge Function Logs
```
Supabase Dashboard → Edge Functions → notify-admin-new-job → Logs
```

Shows:
- Function calls
- Errors
- Execution time
- Request/response data

### Resend Logs
```
Resend Dashboard → Logs
```

Shows:
- Email delivery status
- Opens/clicks (if enabled)
- Bounces/complaints

---

## 🐛 Troubleshooting

### Email not received?

1. **Check Resend Logs**: See if email was sent
2. **Check Edge Function Logs**: Look for errors
3. **Verify Domain**: Ensure eficia.agency is verified
4. **Check Spam**: Email might be in spam folder
5. **Verify Admin User**: Run SQL:
   ```sql
   SELECT email, is_admin FROM profiles WHERE is_admin = true;
   ```

### Function not called?

1. **Browser Console**: Check for JavaScript errors
2. **Network Tab**: Verify function invocation
3. **User Not Admin**: Ensure test user has `is_admin = false`

---

## 💰 Costs

- **Resend Free Tier**: 100 emails/day, 3,000/month
- **Supabase Edge Functions**: Free up to 2M requests/month
- **Storage**: Included in Supabase plan

For production with many uploads, consider Resend paid plan ($20/month for 50k emails).

---

## 🎨 Customization

### Change Email Template

Edit: `supabase/functions/notify-admin-new-job/index.ts` (lines 85-154)

Then redeploy:
```bash
supabase functions deploy notify-admin-new-job
```

### Change Sender Email

Edit line 165 in `index.ts`:
```typescript
from: 'Your Name <noreply@yourdomain.com>',
```

Must be verified domain in Resend.

### Change Link Expiry

Edit line 60 in `index.ts`:
```typescript
.createSignedUrl(payload.filePath, 604800) // 7 days in seconds
```

---

## 📚 Full Documentation

See: `supabase/ADMIN_NOTIFICATIONS_SETUP.md`

---

## 🆘 Need Help?

1. Check the logs (Edge Functions + Resend)
2. Review `ADMIN_NOTIFICATIONS_SETUP.md`
3. Test with curl command (see setup guide)
4. Verify all environment variables

---

**Created**: 2024-12-05
**Status**: Ready to deploy
**Dependencies**: Resend API, Supabase Edge Functions
**Estimated Setup Time**: 5 minutes
