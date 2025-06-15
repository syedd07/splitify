
-- Clean up all invite-related database objects

-- Drop the card_invitations table and all its dependencies
DROP TABLE IF EXISTS public.card_invitations CASCADE;

-- Drop the card_members table and all its dependencies  
DROP TABLE IF EXISTS public.card_members CASCADE;

-- Drop the general invitations table if it exists
DROP TABLE IF EXISTS public.invitations CASCADE;

-- Drop any functions related to invites
DROP FUNCTION IF EXISTS public.create_card_owner_member() CASCADE;

-- Clean up any remaining policies on credit_cards that might reference invite tables
-- (keeping only the basic user policies)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on credit_cards
    FOR r IN (SELECT policyname FROM pg_policies 
              WHERE schemaname = 'public' AND tablename = 'credit_cards')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.credit_cards', r.policyname);
    END LOOP;
END $$;

-- Recreate simple credit cards policies (owner only, no sharing)
CREATE POLICY "Users can view their own credit cards" 
  ON public.credit_cards 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards" 
  ON public.credit_cards 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards" 
  ON public.credit_cards 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards" 
  ON public.credit_cards 
  FOR DELETE 
  USING (auth.uid() = user_id);
