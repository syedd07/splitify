
-- Fix ambiguous column references with proper table aliases
CREATE OR REPLACE FUNCTION public.user_is_card_owner(card_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the card directly
  IF EXISTS (
    SELECT 1 FROM public.credit_cards cc
    WHERE cc.id = card_id AND cc.user_id = user_is_card_owner.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is marked as owner in card_members
  IF EXISTS (
    SELECT 1 FROM public.card_members cm
    WHERE cm.credit_card_id = card_id 
    AND cm.user_id = user_is_card_owner.user_id
    AND cm.role = 'owner'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix ambiguous column references with proper table aliases
CREATE OR REPLACE FUNCTION public.user_is_card_member(card_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the card directly
  IF EXISTS (
    SELECT 1 FROM public.credit_cards cc
    WHERE cc.id = card_id AND cc.user_id = user_is_card_member.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (owner or member role)
  IF EXISTS (
    SELECT 1 FROM public.card_members cm
    WHERE cm.credit_card_id = card_id 
    AND cm.user_id = user_is_card_member.user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
