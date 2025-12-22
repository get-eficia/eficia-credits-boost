import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Manual webhook signature verification using Web Crypto API
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    // Extract timestamp and signatures from header
    const signatureData = signature.split(",").reduce((acc: any, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.v1 = value;
      return acc;
    }, {});

    if (!signatureData.timestamp || !signatureData.v1) {
      return false;
    }

    // Create signed payload: timestamp.payload
    const signedPayload = `${signatureData.timestamp}.${payload}`;

    // Import secret key
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Generate signature
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );

    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Compare signatures
    return computedSignature === signatureData.v1;
  } catch (err) {
    logStep("Signature verification error", { error: err });
    return false;
  }
}

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get raw body as text
    const body = await req.text();
    logStep("Body received", { bodyLength: body.length });

    let event: Stripe.Event;

    // If webhook secret is configured, verify the signature manually
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        logStep("No stripe-signature header found");
        throw new Error("No stripe-signature header");
      }

      // Use manual verification instead of Stripe's library
      const isValid = await verifyWebhookSignature(
        body,
        signature,
        webhookSecret
      );

      if (!isValid) {
        logStep("Webhook signature verification failed - invalid signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
        });
      }

      logStep("Signature verified successfully");
      event = JSON.parse(body);
    } else {
      // TEMPORARY: Skip signature verification if no secret (for testing only)
      logStep(
        "WARNING: Skipping signature verification - STRIPE_WEBHOOK_SECRET not set"
      );
      event = JSON.parse(body);
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { sessionId: session.id });

      const metadata = session.metadata;
      if (!metadata) {
        logStep("No metadata found in session");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
        });
      }

      const { pack_id, credits, user_id } = metadata;
      logStep("Metadata extracted", { pack_id, credits, user_id });

      if (!credits || !user_id) {
        logStep("Missing required metadata fields");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
        });
      }

      // Initialize Supabase with service role key for write operations
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      // Get user's current credit balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credit_balance")
        .eq("user_id", user_id)
        .single();

      if (profileError || !profile) {
        logStep("Profile not found for user", {
          user_id,
          error: profileError?.message,
        });
        throw new Error(`Profile not found for user ${user_id}`);
      }

      const creditAmount = parseInt(credits, 10);
      const currentBalance = profile.credit_balance || 0;
      const newBalance = currentBalance + creditAmount;

      logStep("Current balance retrieved", {
        currentBalance,
        creditAmount,
        newBalance,
      });

      // Update credit balance in profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credit_balance: newBalance })
        .eq("user_id", user_id);

      if (updateError) {
        throw new Error(
          `Failed to update credit balance: ${updateError.message}`
        );
      }

      logStep("Credit balance updated successfully");

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: user_id,
          amount: creditAmount,
          type: "purchase",
          description: pack_id
            ? `Credit pack purchase: ${pack_id}`
            : "Credit purchase",
          stripe_payment_intent_id: session.payment_intent as string,
        });

      if (transactionError) {
        logStep("Transaction record creation failed", {
          error: transactionError.message,
        });
        throw new Error(
          `Failed to create transaction: ${transactionError.message}`
        );
      }

      logStep("Credit transaction recorded successfully");

      logStep("Payment processed successfully", { credits, user_id });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
});
