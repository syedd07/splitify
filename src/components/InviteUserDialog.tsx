import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send } from 'lucide-react';

interface InviteUserDialogProps {
  cardId: string;
  cardName: string;
  trigger: React.ReactNode;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  cardId,
  cardName,
  trigger
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Add an abort controller for API calls
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Create new abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        toast({
          title: "Operation timed out",
          description: "The invitation process took too long. Please try again.",
          variant: "destructive",
        });
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }
    }, 15000); // 15 second timeout
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      const inviteEmail = email.toLowerCase().trim();

      // Check if user is trying to invite themselves
      if (inviteEmail === user.email?.toLowerCase()) {
        toast({
          title: "Error",
          description: "You cannot invite yourself",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get the card's current shared_emails
      const { data: cardData, error: cardError } = await supabase
        .from('credit_cards')
        .select('shared_emails, user_id')
        .eq('id', cardId)
        .single();

      if (cardError) {
        throw cardError;
      }

      // Check if user owns this card
      if (cardData.user_id !== user.id) {
        toast({
          title: "Error",
          description: "Only card owners can send invitations",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Safely handle shared_emails as Json type
      const currentSharedEmails = Array.isArray(cardData.shared_emails) 
        ? cardData.shared_emails as string[]
        : [];

      // Check if email is already shared
      if (currentSharedEmails.includes(inviteEmail)) {
        toast({
          title: "Already shared",
          description: "This email already has access to the card",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get user profile to get inviter's name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Continue with null name if profile fetch fails
      }
        
      const inviterName = profileData?.full_name || user.email?.split('@')[0] || 'A Splitify user';

      // Call the admin-invite-user Edge Function to handle both DB updates and email sending
      const { data: inviteData, error: inviteFunctionError } = await supabase.functions.invoke(
        'admin-invite-user',
        {
          body: {
            cardId: cardId,
            cardName: cardName,
            invitedEmail: inviteEmail,
            inviterName: inviterName
          }
        }
      );

      if (inviteFunctionError) {
        throw inviteFunctionError;
      }

      // Show appropriate message based on the function response
      if (inviteData?.warning) {
        toast({
          title: "Invitation Created",
          description: inviteData.message || "User has been invited but there may be issues with email delivery",
          
        });
      } else {
        toast({
          title: "Invitation Sent!",
          description: inviteData?.message || `${inviteEmail} has been invited to access ${cardName}`,
        });
      }

      // Clear the timeout on success
      clearTimeout(timeoutId);
      
      setEmail('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };
  
  // Also modify your Dialog component to reset state when closed
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && isLoading) {
        // Cancel any pending operations when dialog is closed
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setIsLoading(false);
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite someone to access "{cardName}". They'll be able to view and add transactions to this card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleInvite();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
