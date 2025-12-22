// Edge Function to notify admins when a new enrichment job is uploaded
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const GMAIL_USER = Deno.env.get('GMAIL_USER') // g.darroux@gmail.com
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') // App password from Google
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface EmailPayload {
  jobId: string
  userId: string
  filename: string
  filePath: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the webhook payload
    const payload: EmailPayload = await req.json()

    console.log('Received payload:', payload)

    // Create Supabase client with service role
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone')
      .eq('user_id', payload.userId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    // Get billing profile for company info
    const { data: billingProfile } = await supabase
      .from('billing_profiles')
      .select('company_name')
      .eq('user_id', payload.userId)
      .maybeSingle()

    // Get all admin emails
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('is_admin', true)

    if (adminsError || !admins || admins.length === 0) {
      console.error('Error fetching admins:', adminsError)
      throw new Error('No admins found')
    }

    // Generate signed URL for the uploaded file (valid for 7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('enrich-uploads')
      .createSignedUrl(payload.filePath, 604800) // 7 days in seconds

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
    }

    const downloadUrl = signedUrlData?.signedUrl || 'URL not available'
    const dashboardUrl = `${Deno.env.get("PUBLIC_SITE_URL") || "https://eficia-credits-boost.vercel.app"}/admin`

    // Format user info
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A'
    const companyName = billingProfile?.company_name || 'N/A'
    const userPhone = profile.phone || 'N/A'

    // Send email to each admin
    const emailPromises = admins.map(async (admin) => {
      const adminFirstName = admin.first_name || 'Admin'

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; border-left: 4px solid #8B5CF6; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .info-row { margin: 8px 0; }
    .label { font-weight: bold; color: #8B5CF6; }
    .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📁 New File Upload</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Eficia Credits Boost</p>
    </div>

    <div class="content">
      <p>Hello ${adminFirstName},</p>

      <p>A user has just uploaded a new file for enrichment. Here are the details:</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #8B5CF6;">📄 File Information</h3>
        <div class="info-row">
          <span class="label">Filename:</span> ${payload.filename}
        </div>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #8B5CF6;">👤 User Information</h3>
        <div class="info-row">
          <span class="label">Name:</span> ${userName}
        </div>
        <div class="info-row">
          <span class="label">Email:</span> ${profile.email}
        </div>
        <div class="info-row">
          <span class="label">Phone:</span> ${userPhone}
        </div>
        <div class="info-row">
          <span class="label">Company:</span> ${companyName}
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${downloadUrl}" class="button">⬇️ Download File</a>
        <a href="${dashboardUrl}" class="button">🎛️ Go to Dashboard</a>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        <strong>Next steps:</strong><br>
        1. Download the file using the button above<br>
        2. Process the enrichment<br>
        3. Upload the enriched file in the admin dashboard<br>
        4. Mark the job as completed
      </p>
    </div>

    <div class="footer">
      <p>This is an automated notification from Eficia Credits Boost</p>
      <p>Download link expires in 7 days</p>
    </div>
  </div>
</body>
</html>
      `

      // Create SMTP client for Gmail
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: GMAIL_USER!,
            password: GMAIL_APP_PASSWORD!,
          },
        },
      })

      // Truncate filename if too long to avoid MIME encoding issues
      const truncatedFilename = payload.filename.length > 50
        ? payload.filename.substring(0, 47) + '...'
        : payload.filename;

      await client.send({
        from: `Eficia Credits Boost <${GMAIL_USER}>`,
        to: admin.email,
        subject: `New File Upload: ${truncatedFilename}`,
        content: "auto",
        html: emailHtml,
      })

      await client.close()

      console.log(`Email sent successfully to ${admin.email}`)
      return { success: true, email: admin.email }
    })

    const results = await Promise.all(emailPromises)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails sent to ${admins.length} admin(s)`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in notify-admin-new-job function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
