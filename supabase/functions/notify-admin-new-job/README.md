# notify-admin-new-job Edge Function

Sends email notifications to all admin users when a non-admin user uploads a new file for enrichment.

## Purpose

Automatically notify administrators about new enrichment job uploads so they can:
- Download the original file
- Process the enrichment
- Upload the enriched result
- Update job status

## Trigger

This function is called from the frontend (`Dashboard.tsx`) after a successful file upload.

## Environment Variables

Required (auto-provided by Supabase):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

Required (must be set manually):
- `RESEND_API_KEY`: API key from Resend.com for sending emails

## Input Payload

```typescript
{
  jobId: string      // UUID of the enrich_jobs record
  userId: string     // UUID of the user who uploaded
  filename: string   // Original filename
  filePath: string   // Storage path of the uploaded file
}
```

## Output

```typescript
{
  success: boolean
  message: string
  results: Array<{
    id: string  // Email ID from Resend
  }>
}
```

## Email Content

The email includes:
- User information (name, email, phone, company)
- Uploaded filename
- Direct download link (valid for 7 days)
- Link to admin dashboard
- Next steps instructions

## Error Handling

- Continues even if some emails fail
- Logs errors for debugging
- Returns detailed error information

## Testing

```bash
# Local testing
supabase functions serve notify-admin-new-job

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/notify-admin-new-job' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "jobId": "test-id",
    "userId": "test-user-id",
    "filename": "test.csv",
    "filePath": "uploads/test-user-id/test.csv"
  }'
```

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy notify-admin-new-job

# Set secrets
supabase secrets set RESEND_API_KEY=re_your_key_here
```

## Dependencies

- Deno standard library
- @supabase/supabase-js@2
- Resend API

## Notes

- Signed URLs expire after 7 days (604800 seconds)
- Uses service role key to bypass RLS policies
- Only fetches profiles where is_admin = true
- Email sent from: `Eficia Credits Boost <noreply@eficia.agency>`
