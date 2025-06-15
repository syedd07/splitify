
-- Final comprehensive fix for infinite recursion
-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Members can view shared cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can view accessible cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can view their own cards or cards they're members of" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view accessible transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create accessible transactions" ON public.transactions;

-- Create the most basic policies that cannot recurse
-- Policy 1: Users can only see cards they own directly
CREATE POLICY "Direct owner access" 
  ON public.credit_cards 
  FOR ALL 
  USING (user_id = auth.uid());

-- Policy 2: Users can see cards they are members of (using a simple subquery)
CREATE POLICY "Member access to shared cards" 
  ON public.credit_cards 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.card_members cm 
      WHERE cm.credit_card_id = credit_cards.id 
        AND cm.user_id = auth.uid()
    )
  );

-- Simple transaction policies
CREATE POLICY "Users can access their transactions" 
  ON public.transactions 
  FOR ALL
  USING (user_id = auth.uid());
