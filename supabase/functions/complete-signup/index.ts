import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName: string;
  vatNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
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

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: signupData.email,
      password: signupData.password,
      email_confirm: false,
      user_metadata: {
        first_name: signupData.firstName,
        last_name: signupData.lastName,
      },
    });

    // Generate and send confirmation email
    if (authData.user && !authError) {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: signupData.email,
      });

      if (!linkError && linkData) {
        console.log("Confirmation link generated:", linkData.properties.action_link);

        // Send confirmation email via Gmail SMTP
        try {
          const confirmLink = linkData.properties.action_link;

          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎉 Welcome to Eficia!</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Credits Boost Platform</p>
    </div>

    <div class="content">
      <p>Hello ${signupData.firstName} ${signupData.lastName},</p>

      <p>Thank you for creating an account with Eficia Credits Boost! We're excited to have you on board.</p>

      <p>To complete your registration and start using our phone number enrichment service, please confirm your email address by clicking the button below:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmLink}" class="button">✓ Confirm Email Address</a>
      </div>

      <div class="info-box">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Account Details:</strong><br>
          Email: ${signupData.email}<br>
          Company: ${signupData.companyName}
        </p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${confirmLink}" style="color: #667eea; word-break: break-all;">${confirmLink}</a>
      </p>

      <p style="color: #666; font-size: 14px;">
        If you didn't create this account, you can safely ignore this email.
      </p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The Eficia Team</strong>
      </p>
    </div>

    <div class="footer">
      <p>This is an automated message from Eficia Credits Boost</p>
      <p>© ${new Date().getFullYear()} Eficia. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `;

          const gmailUser = Deno.env.get("GMAIL_USER");
          const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

          if (!gmailUser || !gmailPassword) {
            console.error("Gmail credentials not configured");
            throw new Error("Email service not configured");
          }

          // Create SMTP client
          const smtpClient = new SMTPClient({
            connection: {
              hostname: "smtp.gmail.com",
              port: 465,
              tls: true,
              auth: {
                username: gmailUser,
                password: gmailPassword,
              },
            },
          });

          await smtpClient.send({
            from: `Eficia Credits Boost <${gmailUser}>`,
            to: signupData.email,
            subject: "🎉 Confirm your email - Eficia Credits Boost",
            content: "auto",
            html: emailHtml,
          });

          await smtpClient.close();

          console.log(`Confirmation email sent successfully to ${signupData.email}`);
        } catch (emailErr) {
          console.error("Error sending confirmation email:", emailErr);
          // Don't throw - account was created, user can request new confirmation email
        }
      }
    }

    if (authError) {
      console.error("Auth user creation error:", authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("No user returned from auth");
    }

    const userId = authData.user.id;
    console.log("User created:", userId);

    // 2. Create complete profile with ALL billing info in one go (bypasses RLS with service role)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        email: signupData.email,
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        phone: signupData.phone || null,
        is_admin: false,
        company_name: signupData.companyName,
        vat_number: signupData.vatNumber || null,
        billing_address: `${signupData.addressLine1}${
          signupData.addressLine2 ? "\n" + signupData.addressLine2 : ""
        }`,
        billing_city: signupData.city,
        billing_postal_code: signupData.postalCode,
        billing_country: signupData.country,
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
