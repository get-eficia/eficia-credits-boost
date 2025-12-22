// Edge Function to notify user when their enrichment job is completed
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface NotificationPayload {
  jobId: string;
  userId: string;
  filename: string;
  numbersFound: number;
  creditedNumbers: number;
  enrichedFileUrl?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();

    console.log("Received completion notification payload:", payload);

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user information
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", payload.userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    const userName =
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
      profile.email.split("@")[0];
    const dashboardUrl = `${
      Deno.env.get("PUBLIC_SITE_URL") ||
      "https://eficia-credits-boost.vercel.app"
    }/app`;

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
    .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 20px 0; }
    .info-box { background: white; border-left: 4px solid #8B5CF6; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .info-row { margin: 8px 0; }
    .label { font-weight: bold; color: #8B5CF6; }
    .highlight { color: #8B5CF6; font-weight: bold; font-size: 24px; }
    .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Your Data is Ready!</h1>
      <img src="https://eficia-credits-boost.vercel.app/eficia-logo.png" alt="Eficia" class="logo" />
    </div>

    <div class="content">
      <p>Hello ${userName},</p>

      <p>Great news! Your enrichment job has been completed successfully.</p>

      <div style="text-align: center;">
        <span class="success-badge">✓ Processing Complete</span>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #8B5CF6;">📊 Results Summary</h3>
        <div class="info-row">
          <span class="label">File:</span> ${payload.filename}
        </div>
        <div class="info-row">
          <span class="label">Numbers Found:</span> <span class="highlight">${payload.numbersFound.toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="label">Credits Used:</span> ${payload.creditedNumbers.toLocaleString()}
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="button">🚀 Go to My Dashboard</a>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Your enriched file is now available in your dashboard. Click the button above to download it.
      </p>

      <p style="color: #666; font-size: 14px;">
        If you have any questions, feel free to reply to this email.
      </p>
    </div>

    <div class="footer">
      <p>This is an automated notification from Eficia</p>
      <p>© ${new Date().getFullYear()} Eficia. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

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
    });

    // Truncate filename if too long to avoid MIME encoding issues
    const truncatedFilename =
      payload.filename.length > 40
        ? payload.filename.substring(0, 37) + "..."
        : payload.filename;

    await client.send({
      from: `Eficia <${GMAIL_USER}>`,
      to: profile.email,
      subject: `Your enriched file is ready: ${truncatedFilename}`,
      content: "auto",
      html: emailHtml,
    });

    await client.close();

    console.log(`Completion email sent successfully to ${profile.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User notified successfully",
        userEmail: profile.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in notify-user-job-completed function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
