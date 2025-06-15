
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InviteUserDialogProps {
  cardId: string;
  cardName: string;
  trigger?: React.ReactNode;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  cardId,
  cardName,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user is already invited or a member
      const { data: existingInvite } = await supabase
        .from('card_invitations')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('invited_email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        toast({
          title: "Already invited",
          description: "This user has already been invited to this card",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a member by looking up their profile first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        // Check if this user is already a member
        const { data: existingMember } = await supabase
          .from('card_members')
          .select('*')
          .eq('credit_card_id', cardId)
          .eq('user_id', existingProfile.id)
          .maybeSingle();

        if (existingMember) {
          toast({
            title: "Already a member",
            description: "This user is already a member of this card",
            variant: "destructive",
          });
          return;
        }
      }

      // Create the invitation in database
      const { error: inviteError } = await supabase
        .from('card_invitations')
        .insert({
          credit_card_id: cardId,
          inviter_user_id: user.id,
          invited_email: email.toLowerCase(),
        });

      if (inviteError) throw inviteError;

      // Generate invitation link with the invitation context
      const inviteUrl = `${window.location.origin}/auth?invite=${cardId}&email=${encodeURIComponent(email.toLowerCase())}`;
      
      // Use Supabase's built-in email sending by creating a temporary signup with invite context
      const { error: emailError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Random password
        options: {
          emailRedirectTo: inviteUrl,
          data: {
            invitation_type: 'card_invitation',
            card_id: cardId,
            card_name: cardName,
            inviter_name: user.user_metadata?.full_name || user.email,
            custom_invite_url: inviteUrl
          }
        }
      });

      if (emailError && !emailError.message.includes('already registered')) {
        console.error('Error sending invitation email:', emailError);
        toast({
          title: "Invitation created",
          description: `Invitation created for ${email} but email delivery failed. They can still access the card by logging in.`,
          variant: "destructive",
        });
      } else {
        console.log('Invitation email sent successfully via Supabase');
        toast({
          title: "Invitation sent!",
          description: `Successfully sent invitation to ${email} for ${cardName}.`,
        });
      }

      setEmail('');
      setOpen(false);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <UserPlus className="w-4 h-4 mr-2" />
      Invite User
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Invite User to {cardName}
          </DialogTitle>
          <DialogDescription>
            Send an invitation to share this credit card with another user
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
            />
            <p className="text-sm text-muted-foreground">
              The user will receive an invitation email to access this credit card
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
