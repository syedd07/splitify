
-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transactions for cards they own
CREATE POLICY "Users can view transactions for owned cards" 
  ON public.transactions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc 
      WHERE cc.id = transactions.credit_card_id 
      AND cc.user_id = auth.uid()
    )
  );

-- Policy: Users can view transactions for cards they are members of
CREATE POLICY "Users can view transactions for member cards" 
  ON public.transactions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.card_members cm 
      WHERE cm.credit_card_id = transactions.credit_card_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Policy: Users can insert transactions for cards they own
CREATE POLICY "Users can insert transactions for owned cards" 
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

-- Policy: Users can insert transactions for cards they are members of
CREATE POLICY "Users can insert transactions for member cards" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.card_members cm 
      WHERE cm.credit_card_id = credit_card_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own transactions on cards they have access to
CREATE POLICY "Users can update own transactions" 
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
CREATE POLICY "Users can delete own transactions" 
  ON public.transactions 
  FOR DELETE 
  USING (auth.uid() = user_id);
