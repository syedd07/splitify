
-- Fix infinite recursion in credit_cards RLS policies
-- Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view their own cards or cards they're members of" ON public.credit_cards;

-- Create a simpler policy that avoids recursion
CREATE POLICY "Users can view accessible cards" 
  ON public.credit_cards 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT credit_card_id 
      FROM public.card_members 
      WHERE user_id = auth.uid()
    )
  );

-- Also fix the transactions policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view transactions for cards they have access to" ON public.transactions;
CREATE POLICY "Users can view accessible transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR
    credit_card_id IN (
      SELECT id FROM public.credit_cards WHERE user_id = auth.uid()
      UNION
      SELECT credit_card_id FROM public.card_members WHERE user_id = auth.uid()
    )
  );

-- Fix the transaction insert policy as well
DROP POLICY IF EXISTS "Users can create transactions for cards they have access to" ON public.transactions;
CREATE POLICY "Users can create accessible transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() AND (
      credit_card_id IN (
        SELECT id FROM public.credit_cards WHERE user_id = auth.uid()
        UNION
        SELECT credit_card_id FROM public.card_members WHERE user_id = auth.uid()
      )
    )
  );
