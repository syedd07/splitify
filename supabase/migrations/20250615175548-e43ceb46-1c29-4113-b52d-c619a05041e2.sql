
-- Check which constraints don't exist and add them individually
-- This will only add constraints that don't already exist

-- Add foreign key for credit_card_id in card_members (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'card_members_credit_card_id_fkey' 
        AND table_name = 'card_members'
    ) THEN
        ALTER TABLE public.card_members 
        ADD CONSTRAINT card_members_credit_card_id_fkey 
        FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for credit_card_id in card_invitations (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'card_invitations_credit_card_id_fkey' 
        AND table_name = 'card_invitations'
    ) THEN
        ALTER TABLE public.card_invitations 
        ADD CONSTRAINT card_invitations_credit_card_id_fkey 
        FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for inviter_user_id in card_invitations (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'card_invitations_inviter_user_id_fkey' 
        AND table_name = 'card_invitations'
    ) THEN
        ALTER TABLE public.card_invitations 
        ADD CONSTRAINT card_invitations_inviter_user_id_fkey 
        FOREIGN KEY (inviter_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for invited_user_id in card_invitations (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'card_invitations_invited_user_id_fkey' 
        AND table_name = 'card_invitations'
    ) THEN
        ALTER TABLE public.card_invitations 
        ADD CONSTRAINT card_invitations_invited_user_id_fkey 
        FOREIGN KEY (invited_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
