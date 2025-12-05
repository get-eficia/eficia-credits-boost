#!/bin/bash

# =====================================================
# Deploy Admin Notification System
# =====================================================
# This script deploys the admin notification edge function
# and sets up the required environment variables
# =====================================================

set -e  # Exit on any error

echo "🚀 Deploying Admin Notification System"
echo "======================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✓ Supabase CLI found"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "✓ Logged in to Supabase"

# Check if project is linked
if [ ! -f .supabase/config.toml ]; then
    echo "⚠️  Project not linked. Linking now..."
    supabase link --project-ref olzzcjkcavsqxedrjtpd
fi

echo "✓ Project linked"
echo ""

# Ask for Resend API key if not set
read -p "📧 Enter your Resend API key (re_...): " RESEND_KEY

if [ -z "$RESEND_KEY" ]; then
    echo "❌ Resend API key is required"
    exit 1
fi

echo ""
echo "📤 Setting environment variables..."
supabase secrets set RESEND_API_KEY="$RESEND_KEY"

echo "✓ Environment variables set"
echo ""

echo "🔨 Deploying Edge Function..."
supabase functions deploy notify-admin-new-job --no-verify-jwt

echo "✓ Edge Function deployed"
echo ""

echo "✅ Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Test the notification by uploading a file as a non-admin user"
echo "2. Check Supabase Edge Functions logs for any errors"
echo "3. Verify admin email inbox"
echo ""
echo "Monitoring:"
echo "- Edge Function logs: https://supabase.com/dashboard/project/olzzcjkcavsqxedrjtpd/functions/notify-admin-new-job/logs"
echo "- Resend logs: https://resend.com/logs"
echo ""
echo "Documentation: supabase/ADMIN_NOTIFICATIONS_SETUP.md"
