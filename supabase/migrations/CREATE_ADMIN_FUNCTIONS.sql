-- Create functions that run with SECURITY DEFINER to bypass RLS
-- This allows admins to update credit balances without RLS blocking them

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = check_user_id AND is_admin = true
  );
END;
$$;

-- Function to update credit balance (callable by admins only)
CREATE OR REPLACE FUNCTION public.admin_update_credit_balance(
  target_user_id UUID,
  new_balance INTEGER,
  calling_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if calling user is admin
  IF NOT public.is_user_admin(calling_user_id) THEN
    RAISE EXCEPTION 'Only admins can update credit balances';
  END IF;

  -- Update the credit balance
  UPDATE public.profiles
  SET
    credit_balance = new_balance,
    updated_at = NOW()
  WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_credit_balance TO authenticated;
