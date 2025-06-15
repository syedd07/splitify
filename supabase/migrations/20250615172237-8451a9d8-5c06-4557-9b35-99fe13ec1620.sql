
-- Create card_members table to track who has access to which cards
CREATE TABLE public.card_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, user_id)
);

-- Create card_invitations table to manage pending invitations
CREATE TABLE public.card_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, invited_email)
);

-- Enable RLS on both tables
ALTER TABLE public.card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_card_owner(card_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the card directly
  IF EXISTS (
    SELECT 1 FROM public.credit_cards 
    WHERE id = card_id AND user_id = user_is_card_owner.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is marked as owner in card_members
  IF EXISTS (
    SELECT 1 FROM public.card_members 
    WHERE credit_card_id = card_id 
    AND user_id = user_is_card_owner.user_id 
    AND role = 'owner'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_is_card_member(card_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the card directly
  IF EXISTS (
    SELECT 1 FROM public.credit_cards 
    WHERE id = card_id AND user_id = user_is_card_member.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (owner or member role)
  IF EXISTS (
    SELECT 1 FROM public.card_members 
    WHERE credit_card_id = card_id 
    AND user_id = user_is_card_member.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create simple, non-recursive policies for card_members
CREATE POLICY "Users can view card memberships they own or belong to"
  ON public.card_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    public.user_is_card_owner(credit_card_id, auth.uid())
  );

CREATE POLICY "Card owners can manage members"
  ON public.card_members
  FOR ALL
  USING (public.user_is_card_owner(credit_card_id, auth.uid()));

-- Create policies for card_invitations
CREATE POLICY "Users can view invitations they sent or received"
  ON public.card_invitations
  FOR SELECT
  USING (
    inviter_user_id = auth.uid() OR 
    invited_user_id = auth.uid() OR
    public.user_is_card_owner(credit_card_id, auth.uid())
  );

CREATE POLICY "Card owners can manage invitations"
  ON public.card_invitations
  FOR ALL
  USING (public.user_is_card_owner(credit_card_id, auth.uid()));

-- Update credit_cards policies to include shared access (keeping original owner access intact)
DROP POLICY IF EXISTS "Users can view their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can insert their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can update their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can delete their own credit cards" ON public.credit_cards;

-- Recreate credit_cards policies with shared access support
CREATE POLICY "Users can view cards they own or are members of"
  ON public.credit_cards
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    public.user_is_card_member(id, auth.uid())
  );

CREATE POLICY "Users can insert their own credit cards"
  ON public.credit_cards
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Card owners can update their cards"
  ON public.credit_cards
  FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    public.user_is_card_owner(id, auth.uid())
  );

CREATE POLICY "Card owners can delete their cards"
  ON public.credit_cards
  FOR DELETE
  USING (
    user_id = auth.uid() OR 
    public.user_is_card_owner(id, auth.uid())
  );

-- Function to automatically create owner membership when a card is created
CREATE OR REPLACE FUNCTION public.create_card_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the card creator as owner in card_members
  INSERT INTO public.card_members (credit_card_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create owner membership
CREATE TRIGGER create_card_owner_membership_trigger
  AFTER INSERT ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.create_card_owner_membership();
