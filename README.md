# Eficia Credits Boost

A B2B SaaS platform for enriching CSV/Excel files with phone numbers. Users upload their contact lists and receive enriched data with validated phone numbers.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project
cd eficia-credits-boost

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

## 📚 Documentation

- **[Setup Instructions](supabase/SETUP_INSTRUCTIONS.md)** - Complete database setup guide
- **[Quick Start Guide](supabase/QUICKSTART.md)** - 5-minute setup
- **[Admin Notifications Setup](supabase/ADMIN_NOTIFICATIONS_SETUP.md)** - Email notification configuration
- **[Notifications Quick Start](NOTIFICATIONS_README.md)** - Quick email setup
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Pre-launch checklist
- **[Changelog](supabase/CHANGELOG.md)** - Version history

## ✨ Features

### User Features
- 🔐 Secure authentication with email/password
- 📊 Real-time credit balance tracking
- 📁 CSV/Excel file upload (drag & drop support)
- 📈 Job history and status tracking
- 💳 Credit pack purchase (8 tiers with degressive pricing)
- 🔔 Email notifications on job completion
- 📥 Download enriched files

### Admin Features
- 👥 View all enrichment jobs
- ✏️ Edit job details (status, numbers found, credits)
- 📧 Automatic email alerts for new uploads
- 📤 Upload enriched files
- 💰 Manage user credits and transactions
- 📊 Dashboard with job statistics

### Credit Packs
- **Starter** (50): €14.50 - €0.29/number
- **Mini** (100): €27.00 - €0.27/number (save 7%)
- **Basic** (200): €50.00 - €0.25/number (save 14%)
- **Professional** (500): €110.00 - €0.22/number (save 24%) ⭐ Most Popular
- **Business** (1000): €190.00 - €0.19/number (save 34%)
- **Premium** (2500): €400.00 - €0.16/number (save 45%)
- **Enterprise** (5000): €700.00 - €0.14/number (save 52%)
- **Corporate** (10000): €1200.00 - €0.12/number (save 59%)

## 🛠️ Tech Stack

- **Frontend**: Vite, React 18, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Email**: Resend API
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Form Validation**: Zod

## 📦 Project Structure

```
eficia-credits-boost/
├── src/
│   ├── components/       # React components
│   │   ├── layout/      # Header, Footer
│   │   ├── pricing/     # PricingSlider
│   │   └── ui/          # shadcn components
│   ├── pages/           # Route pages
│   │   ├── Index.tsx    # Landing page
│   │   ├── SignUp.tsx   # Registration
│   │   ├── SignIn.tsx   # Login
│   │   ├── Dashboard.tsx # User dashboard
│   │   └── Admin.tsx    # Admin panel
│   ├── lib/             # Utilities
│   │   └── supabase.ts  # Supabase client & types
│   └── hooks/           # Custom React hooks
├── supabase/
│   ├── functions/       # Edge Functions
│   │   └── notify-admin-new-job/  # Email notifications
│   ├── migrations/      # Database migrations
│   │   ├── 20241203_setup_auth_triggers.sql  # Main setup
│   │   ├── fix_rls_recursion.sql             # RLS fix
│   │   └── verify_setup.sql                  # Verification
│   └── docs/           # Documentation
└── public/             # Static assets
```

## 🔧 Configuration

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

1. Create Supabase project
2. Run migrations in SQL Editor:
   - `20241203_setup_auth_triggers.sql`
   - `fix_rls_recursion.sql`
   - `verify_setup.sql`
3. Create storage bucket: `enrich-uploads`
4. Add storage policies (see QUICKSTART.md)
5. Create admin user with `make_admin.sql`

### Email Notifications

1. Create Resend account
2. Verify domain: `eficia.agency`
3. Get API key
4. Deploy edge function:
   ```bash
   ./supabase/deploy-notifications.sh
   ```

See [NOTIFICATIONS_README.md](NOTIFICATIONS_README.md) for details.

## 🚢 Deployment

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete deployment guide.

### Quick Deploy

```bash
# Build for production
npm run build

# Preview build
npm run preview

# Deploy to Vercel/Netlify/etc
```

## 📋 Database Schema

### Tables
- `profiles` - User information
- `billing_profiles` - Company billing details
- `credit_accounts` - User credit balances
- `credit_packs` - Available credit packages
- `credit_transactions` - Credit movement history
- `enrich_jobs` - File enrichment jobs

### Security
- Row Level Security (RLS) enabled on all tables
- Admin access via JWT metadata (no recursion)
- Automatic profile creation on signup
- Storage policies for file access

## 🧪 Testing

```bash
# Run development server
npm run dev

# Build and check for errors
npm run build

# Preview production build
npm run preview
```

### Manual Testing
1. Sign up as new user
2. Upload CSV file
3. Check admin email notification
4. Admin: process and upload enriched file
5. User: download enriched result

## 📊 Monitoring

- **Supabase**: Database logs, Edge Function logs
- **Resend**: Email delivery, bounces, opens
- **Browser Console**: Frontend errors

## 🆘 Troubleshooting

See specific documentation:
- Database issues: [SETUP_INSTRUCTIONS.md](supabase/SETUP_INSTRUCTIONS.md)
- Email issues: [ADMIN_NOTIFICATIONS_SETUP.md](supabase/ADMIN_NOTIFICATIONS_SETUP.md)
- General setup: [QUICKSTART.md](supabase/QUICKSTART.md)

## 📝 License

Proprietary - Eficia Agency

---

## Project info

**Lovable Project URL**: https://lovable.dev/projects/a1f68fba-5fe3-41f6-aa43-8bd972160bb2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a1f68fba-5fe3-41f6-aa43-8bd972160bb2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a1f68fba-5fe3-41f6-aa43-8bd972160bb2) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
