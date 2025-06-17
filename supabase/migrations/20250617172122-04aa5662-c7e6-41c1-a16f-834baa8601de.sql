
-- Drop all existing RLS policies for transactions table (more comprehensive)
DROP POLICY IF EXISTS "Users can view transactions for owned cards" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transactions for member cards" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transactions for their cards" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions for owned cards" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions for member cards" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their cards" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions for their cards" ON public.transactions;
DROP POLICY IF EXISTS "Card owners can delete any transaction" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions for their cards" ON public.transactions;

-- Create new RLS policies that allow card members to see ALL transactions for cards they have access to

-- Policy: Users can view ALL transactions for cards they own
CREATE POLICY "Card owners can view all transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc 
      WHERE cc.id = transactions.credit_card_id 
      AND cc.user_id = auth.uid()
    )
  );

-- Policy: Users can view ALL transactions for cards they are invited to (via shared_emails)
CREATE POLICY "Card members can view all transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc 
      WHERE cc.id = transactions.credit_card_id 
      AND cc.shared_emails ? (auth.jwt() ->> 'email')
    )
  );

-- Policy: Users can insert transactions for cards they own
CREATE POLICY "Card owners can create transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.credit_cards cc 
      WHERE cc.id = credit_card_id 
      AND cc.user_id = auth.uid()
    )
  );

-- Policy: Users can insert transactions for cards they are invited to
CREATE POLICY "Card members can create transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.credit_cards cc 
      WHERE cc.id = credit_card_id 
      AND cc.shared_emails ? (auth.jwt() ->> 'email')
    )
  );

-- Policy: Users can update their own transactions (fixed name)
CREATE POLICY "Users can update their own transactions" 
  ON public.transactions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Card owners can delete any transaction on their cards
CREATE POLICY "Card owners can delete any transaction" 
  ON public.transactions 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc 
      WHERE cc.id = transactions.credit_card_id 
      AND cc.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete their own transactions" 
  ON public.transactions 
  FOR DELETE 
  USING (auth.uid() = user_id);
