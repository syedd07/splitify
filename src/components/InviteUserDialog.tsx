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

      console.log('Calling admin-invite-user edge function...');

      // Call the admin edge function to handle the invitation
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: {
          cardId: cardId,
          cardName: cardName,
          invitedEmail: email.toLowerCase(),
          inviterName: user.user_metadata?.full_name || user.email,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to send invitation');
      }

      if (data?.error) {
        console.error('Invitation error:', data.error);
        
        if (data.error === 'User already invited') {
          toast({
            title: "Already invited",
            description: "This user has already been invited to this card",
            variant: "destructive",
          });
        } else if (data.error === 'User already a member') {
          toast({
            title: "Already a member",
            description: "This user is already a member of this card",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.warning) {
        console.log('Invitation created with warning:', data.warning);
        toast({
          title: "Invitation created",
          description: data.warning,
          variant: "destructive",
        });
      } else {
        console.log('Invitation sent successfully via admin function');
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
