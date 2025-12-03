import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    // Get raw body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { sessionId: session.id });

      const metadata = session.metadata;
      if (!metadata) {
        logStep("No metadata found in session");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { pack_id, credits, user_id } = metadata;
      logStep("Metadata extracted", { pack_id, credits, user_id });

      if (!credits || !user_id) {
        logStep("Missing required metadata fields");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Initialize Supabase with service role key for write operations
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      
      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      });

      // Get credit account for user
      const { data: creditAccount, error: accountError } = await supabase
        .from("credit_accounts")
        .select("id")
        .eq("user_id", user_id)
        .single();

      if (accountError || !creditAccount) {
        logStep("Credit account not found, creating one", { user_id });
        
        // Create credit account if it doesn't exist
        const { data: newAccount, error: createError } = await supabase
          .from("credit_accounts")
          .insert({ user_id, balance_credits: 0 })
          .select("id")
          .single();

        if (createError || !newAccount) {
          throw new Error(`Failed to create credit account: ${createError?.message}`);
        }

        logStep("Credit account created", { accountId: newAccount.id });
        
        // Create credit transaction
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            credit_account_id: newAccount.id,
            amount: parseInt(credits, 10),
            type: "purchase",
            description: `Pack purchase ${pack_id}`,
          });

        if (transactionError) {
          throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }

        logStep("Credit transaction created for new account");
      } else {
        logStep("Credit account found", { accountId: creditAccount.id });

        // Create credit transaction
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            credit_account_id: creditAccount.id,
            amount: parseInt(credits, 10),
            type: "purchase",
            description: `Pack purchase ${pack_id}`,
          });

        if (transactionError) {
          throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }

        logStep("Credit transaction created");
      }

      logStep("Payment processed successfully", { credits, user_id });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
