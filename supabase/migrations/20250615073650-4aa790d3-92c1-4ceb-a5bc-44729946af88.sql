
-- Create card_invitations table to track invitations to specific cards
CREATE TABLE public.card_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_email TEXT NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'viewer')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, invited_email)
);

-- Create card_members table to track active card members
CREATE TABLE public.card_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.card_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_members ENABLE ROW LEVEL SECURITY;

-- Policies for card_invitations
CREATE POLICY "Users can view invitations for their cards" 
  ON public.card_invitations 
  FOR SELECT 
  USING (
    inviter_id = auth.uid() OR 
    invited_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Card owners can create invitations" 
  ON public.card_invitations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own invitations or card owners can update" 
  ON public.card_invitations 
  FOR UPDATE 
  USING (
    invited_user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    )
  );

-- Policies for card_members
CREATE POLICY "Users can view members of cards they have access to" 
  ON public.card_members 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.credit_card_id = card_members.credit_card_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create card members" 
  ON public.card_members 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Card owners can update member roles" 
  ON public.card_members 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Card owners can remove members" 
  ON public.card_members 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    )
  );

-- Update credit_cards RLS to include card members
DROP POLICY IF EXISTS "Users can view their own cards" ON public.credit_cards;
CREATE POLICY "Users can view their own cards or cards they're members of" 
  ON public.credit_cards 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.card_members 
      WHERE credit_card_id = id AND user_id = auth.uid()
    )
  );

-- Update transactions RLS to include card members
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view transactions for cards they have access to" 
  ON public.transactions 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.card_members 
      WHERE credit_card_id = transactions.credit_card_id AND user_id = auth.uid()
    )
  );

-- Update transaction insert policy for members
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create transactions for cards they have access to" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.credit_cards 
        WHERE id = credit_card_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.card_members 
        WHERE credit_card_id = transactions.credit_card_id AND user_id = auth.uid()
      )
    )
  );

-- Function to automatically create card owner as member
CREATE OR REPLACE FUNCTION public.create_card_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.card_members (credit_card_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create card owner as member when card is created
CREATE TRIGGER create_card_owner_member_trigger
  AFTER INSERT ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.create_card_owner_member();

-- Create indexes for performance
CREATE INDEX idx_card_invitations_credit_card_id ON public.card_invitations(credit_card_id);
CREATE INDEX idx_card_invitations_invited_email ON public.card_invitations(invited_email);
CREATE INDEX idx_card_invitations_status ON public.card_invitations(status);
CREATE INDEX idx_card_members_credit_card_id ON public.card_members(credit_card_id);
CREATE INDEX idx_card_members_user_id ON public.card_members(user_id);
