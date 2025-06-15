
-- Final fix for infinite recursion in credit_cards RLS policies
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view accessible cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can view accessible transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create accessible transactions" ON public.transactions;

-- Create the simplest possible policy for credit_cards that avoids recursion
CREATE POLICY "Users can view own cards" 
  ON public.credit_cards 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Create a separate policy for member access that's more explicit
CREATE POLICY "Members can view shared cards" 
  ON public.credit_cards 
  FOR SELECT 
  USING (
    id = ANY(
      SELECT credit_card_id 
      FROM public.card_members 
      WHERE user_id = auth.uid()
    )
  );

-- Simple transactions policy - only owner access for now
CREATE POLICY "Users can view own transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Simple transaction insert policy 
CREATE POLICY "Users can create own transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());
