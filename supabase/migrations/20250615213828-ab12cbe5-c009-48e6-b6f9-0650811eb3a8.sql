
-- Enable realtime for the transactions table
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- Add the transactions table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Create RLS policies for transactions table to allow proper access
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view transactions for cards they have access to
CREATE POLICY "Users can view transactions for their cards" 
  ON public.transactions 
  FOR SELECT 
  USING (
    user_is_card_member(credit_card_id, auth.uid()) OR
    user_is_card_owner(credit_card_id, auth.uid())
  );

-- Allow users to insert transactions for cards they have access to
CREATE POLICY "Users can create transactions for their cards" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    user_is_card_member(credit_card_id, auth.uid()) OR
    user_is_card_owner(credit_card_id, auth.uid())
  );

-- Allow users to update transactions for cards they have access to
CREATE POLICY "Users can update transactions for their cards" 
  ON public.transactions 
  FOR UPDATE 
  USING (
    user_is_card_member(credit_card_id, auth.uid()) OR
    user_is_card_owner(credit_card_id, auth.uid())
  );

-- Allow users to delete transactions for cards they have access to
CREATE POLICY "Users can delete transactions for their cards" 
  ON public.transactions 
  FOR DELETE 
  USING (
    user_is_card_member(credit_card_id, auth.uid()) OR
    user_is_card_owner(credit_card_id, auth.uid())
  );
