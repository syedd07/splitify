
-- Fix ambiguous column references in public.user_is_card_owner
CREATE OR REPLACE FUNCTION public.user_is_card_owner(card_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the card directly
  IF EXISTS (
    SELECT 1 FROM public.credit_cards 
    WHERE id = card_id AND user_id = public.user_is_card_owner.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is marked as owner in card_members
  IF EXISTS (
    SELECT 1 FROM public.card_members 
    WHERE credit_card_id = card_id 
    AND user_id = public.user_is_card_owner.user_id
    AND role = 'owner'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix ambiguous column references in public.user_is_card_member
CREATE OR REPLACE FUNCTION public.user_is_card_member(card_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the card directly
  IF EXISTS (
    SELECT 1 FROM public.credit_cards 
    WHERE id = card_id AND user_id = public.user_is_card_member.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (owner or member role)
  IF EXISTS (
    SELECT 1 FROM public.card_members 
    WHERE credit_card_id = card_id 
    AND user_id = public.user_is_card_member.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
