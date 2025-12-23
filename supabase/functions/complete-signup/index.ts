import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SignupData {
  email: string;
  password: string;
  phone?: string;
}

// Brevo Email Helper (intégré)
async function sendEmailViaBrevo(
  to: string,
  subject: string,
  htmlContent: string,
  fromEmail = "noreply@get-eficia.fr",
  fromName = "Eficia"
): Promise<{ success: boolean; error?: string }> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY is not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: [
          {
            email: to,
            name: to.split("@")[0],
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return {
        success: false,
        error: `Brevo API returned ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log("✅ Email sent successfully via Brevo:", {
      to,
      subject,
      messageId: data.messageId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email via Brevo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseServiceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const signupData: SignupData = await req.json();

    console.log("Creating user account for:", signupData.email);

    // 1. Create auth user (email already confirmed)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: signupData.email,
        password: signupData.password,
        email_confirm: true, // Email is automatically confirmed
      });

    // Send welcome email
    if (authData.user && !authError) {
      try {
        const loginUrl = `${
          Deno.env.get("PUBLIC_SITE_URL") ||
          "https://eficia-credits-boost.vercel.app"
        }/signin`;

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
    .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .info-box { background: white; border-left: 4px solid #8B5CF6; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎉 Welcome to Eficia!</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Eficia Platform</p>
    </div>

    <div class="content">
      <p>Hello,</p>

      <p>Thank you for creating an account with Eficia ! We're excited to have you on board.</p>

      <p>Your account is ready to use. You can now log in and start enriching your contact data with verified phone numbers.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" class="button">🚀 Access Your Dashboard</a>
      </div>

      <div class="info-box">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Your Account Details:</strong><br>
          Email: ${signupData.email}
        </p>
      </div>

      <p><strong>What's next?</strong></p>
      <ul style="color: #666;">
        <li>Purchase credits to start enriching your data</li>
        <li>Upload your CSV or Excel file with contact information</li>
        <li>Get enriched results within 24 hours maximum</li>
      </ul>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        If you didn't create this account, please contact us immediately.
      </p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The Eficia Team</strong>
      </p>
    </div>

    <div class="footer">
      <p>This is an automated message from Eficia</p>
      <p>© ${new Date().getFullYear()} Eficia. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        console.log(
          `Attempting to send welcome email to ${signupData.email}...`
        );

        // Send email via Brevo
        const emailResult = await sendEmailViaBrevo(
          signupData.email,
          "Welcome to Eficia !",
          emailHtml,
          "noreply@get-eficia.fr",
          "Eficia"
        );

        if (!emailResult.success) {
          console.error("Failed to send welcome email:", emailResult.error);
          // Don't throw - account was created successfully
        } else {
          console.log(
            `✅ Welcome email sent successfully to ${signupData.email}`
          );
        }
      } catch (emailErr) {
        console.error("Error sending welcome email:", emailErr);
        // Don't throw - account was created successfully
      }
    }

    if (authError) {
      console.error("Auth user creation error:", authError);
      console.error("Auth error details:", JSON.stringify(authError, null, 2));

      // Handle duplicate email error - check multiple possible error indicators
      const errorMsg = authError.message?.toLowerCase() || "";
      const isDuplicateEmail =
        errorMsg.includes("already registered") ||
        errorMsg.includes("user already registered") ||
        errorMsg.includes("duplicate") ||
        errorMsg.includes("already exists") ||
        authError.status === 422 ||
        authError.code === "23505"; // PostgreSQL unique violation

      if (isDuplicateEmail) {
        console.log("Detected duplicate email error");
        return new Response(
          JSON.stringify({
            error:
              "An account with this email may already exist. Please try signing in or use a different email address.",
            error_code: "EMAIL_EXISTS",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 409,
          }
        );
      }

      throw authError;
    }

    if (!authData.user) {
      throw new Error("No user returned from auth");
    }

    const userId = authData.user.id;
    console.log("User created:", userId);

    // 2. Create basic profile (billing info will be added later on first purchase)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        email: signupData.email,
        phone: signupData.phone || null,
        is_admin: false,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log("Profile created successfully with all data");

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: signupData.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Signup error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
