
import React, { useState } from 'react';
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

    setIsLoading(true);
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
        return;
      }

      const currentSharedEmails = cardData.shared_emails || [];

      // Check if email is already shared
      if (currentSharedEmails.includes(inviteEmail)) {
        toast({
          title: "Already shared",
          description: "This email already has access to the card",
          variant: "destructive",
        });
        return;
      }

      // Add email to shared_emails
      const updatedSharedEmails = [...currentSharedEmails, inviteEmail];
      
      const { error: updateError } = await supabase
        .from('credit_cards')
        .update({ shared_emails: updatedSharedEmails })
        .eq('id', cardId);

      if (updateError) {
        throw updateError;
      }

      // Create invitation record
      const { error: inviteError } = await supabase
        .from('card_invitations')
        .insert({
          credit_card_id: cardId,
          inviter_user_id: user.id,
          invited_email: inviteEmail,
          status: 'pending'
        });

      if (inviteError) {
        console.error('Error creating invitation record:', inviteError);
        // Don't fail the whole process if invitation record fails
      }

      toast({
        title: "Invitation sent!",
        description: `${inviteEmail} can now access ${cardName} when they log in`,
      });

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
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
