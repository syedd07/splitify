
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardInviteFormProps {
  cardId: string;
  cardName: string;
  onClose?: () => void;
  onInviteSent?: () => void;
}

const CardInviteForm = ({ cardId, cardName, onClose, onInviteSent }: CardInviteFormProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if invitation already exists for this card
      const { data: existingInvitation } = await supabase
        .from('card_invitations')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('invited_email', email.trim().toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        toast({
          title: "Invitation already sent",
          description: "An invitation has already been sent to this email for this card.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create card invitation record
      const { error: inviteError } = await supabase
        .from('card_invitations')
        .insert({
          credit_card_id: cardId,
          inviter_id: user.id,
          invited_email: email.trim().toLowerCase(),
        });

      if (inviteError) throw inviteError;

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-card-invitation', {
        body: {
          email: email.trim().toLowerCase(),
          cardName,
          inviterName: user.user_metadata?.full_name || user.email || 'Someone',
          cardId,
        },
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        toast({
          title: "Invitation created",
          description: "Invitation was created but email sending failed. Please contact the user directly.",
        });
      } else {
        toast({
          title: "Invitation sent!",
          description: `An invitation to access "${cardName}" has been sent to ${email}`,
        });
      }

      setEmail('');
      onInviteSent?.();
      onClose?.();
    } catch (error: any) {
      console.error('Invitation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invite to "{cardName}"
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              They'll be able to view transactions and add their own expenses for this card.
            </p>
          </div>

          <div className="flex gap-2">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CardInviteForm;
