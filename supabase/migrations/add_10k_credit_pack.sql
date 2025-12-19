-- =====================================================
-- ADD 10,000 CREDIT PACK
-- =====================================================
-- Add the Corporate pack (10,000 credits) if it doesn't exist

INSERT INTO public.credit_packs (name, credits, price, price_per_credit, is_popular, features, is_active)
VALUES (
  'Corporate',
  10000,
  1200.00,
  0.1200,
  false,
  ARRAY[
    '10000 phone numbers',
    'Dedicated support',
    'Custom SLA',
    'No expiration',
    '0.12€ per number',
    'Save 59%'
  ],
  true
)
ON CONFLICT (credits) DO UPDATE SET
  is_active = true,
  price = EXCLUDED.price,
  price_per_credit = EXCLUDED.price_per_credit,
  features = EXCLUDED.features;
