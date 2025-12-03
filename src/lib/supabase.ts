import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on your schema
export interface Profile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  vat_number: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  price_per_credit: number;
  is_popular: boolean;
  is_active: boolean;
  features: string[] | null;
  created_at: string;
}

export interface CreditAccount {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface EnrichJob {
  id: string;
  user_id: string;
  original_filename: string;
  original_file_path: string;
  enriched_file_path: string | null;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  total_rows: number | null;
  numbers_found: number | null;
  credited_numbers: number | null;
  admin_note: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreditTransaction {
  id: string;
  credit_account_id: string;
  amount: number;
  type: 'purchase' | 'enrich_deduction' | 'refund' | 'adjustment';
  description: string | null;
  related_job_id: string | null;
  related_pack_id: string | null;
  created_at: string;
}

// Helper functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'uploaded':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};
