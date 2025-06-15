
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InviteUserFormProps {
  onClose?: () => void;
  onInviteSent?: () => void;
}

const InviteUserForm = ({ onClose, onInviteSent }: InviteUserFormProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if invitation already exists in our tracking table
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        toast({
          title: "Invitation already sent",
          description: "An invitation has already been sent to this email address.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Use Supabase's built-in invite method
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth`,
          data: {
            invited_by: user.user_metadata?.full_name || user.email || 'Someone',
          }
        }
      );

      if (inviteError) throw inviteError;

      // Create invitation record in our tracking table
      const { error: trackingError } = await supabase
        .from('invitations')
        .insert({
          inviter_id: user.id,
          email: email.trim().toLowerCase(),
        });

      if (trackingError) {
        console.error('Tracking error:', trackingError);
        // Don't fail the process if tracking fails
      }

      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${email}`,
      });

      setEmail('');
      onInviteSent?.();
      onClose?.();
    } catch (error: any) {
      console.error('Invitation error:', error);
      let errorMessage = error.message || "Failed to send invitation";
      
      // Provide more user-friendly error messages
      if (error.message?.includes('User already registered')) {
        errorMessage = 'This email is already registered in the system.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
          Invite User
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

export default InviteUserForm;
