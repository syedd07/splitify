
-- Ultimate fix for infinite recursion - completely rebuild policies from scratch
-- First, completely disable RLS temporarily to clear any cached policies
ALTER TABLE public.credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies with force
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies 
              WHERE schemaname = 'public' AND tablename IN ('credit_cards', 'transactions'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create completely new, simple policies
CREATE POLICY "credit_cards_owner_policy" 
  ON public.credit_cards 
  FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "credit_cards_member_policy" 
  ON public.credit_cards 
  FOR SELECT 
  USING (
    id IN (
      SELECT credit_card_id 
      FROM public.card_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_user_policy" 
  ON public.transactions 
  FOR ALL
  USING (user_id = auth.uid());
