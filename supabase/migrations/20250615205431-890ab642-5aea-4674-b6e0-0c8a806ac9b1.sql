
-- Add shared_emails column to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN shared_emails jsonb DEFAULT '[]'::jsonb;

-- Create an index for better performance when searching shared emails
CREATE INDEX idx_credit_cards_shared_emails ON public.credit_cards USING gin(shared_emails);

-- Update the credit_cards RLS policy to include email-based sharing
DROP POLICY IF EXISTS "Users can view shared credit cards" ON public.credit_cards;

CREATE POLICY "Users can view email-shared credit cards" 
  ON public.credit_cards 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND shared_emails ? LOWER(p.email)
    )
  );
