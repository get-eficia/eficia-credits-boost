-- Fix RLS policy for admin to insert credit transactions
-- The issue: INSERT policies need WITH CHECK, not USING

DROP POLICY IF EXISTS "Admins can insert transactions" ON public.credit_transactions;

CREATE POLICY "Admins can insert transactions"
  ON public.credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Also add UPDATE policy for admins (might be needed in the future)
DROP POLICY IF EXISTS "Admins can update transactions" ON public.credit_transactions;

CREATE POLICY "Admins can update transactions"
  ON public.credit_transactions FOR UPDATE
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );
