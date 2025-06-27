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
import { Loader2, Link as LinkIcon, Copy, CheckCircle2 } from 'lucide-react';

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
  const [invitationUrl, setInvitationUrl] = useState('');
  const [invitationGenerated, setInvitationGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const handleGenerateInvite = async () => {
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

      // Create invitation record
      const { data: invitationData, error: inviteError } = await supabase
        .from('card_invitations')
        .insert({
          credit_card_id: cardId,
          inviter_user_id: user.id,
          invited_email: inviteEmail,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id')
        .single();
        
      if (inviteError) {
        throw inviteError;
      }

      // Generate invitation URL - use encodeURIComponent to properly handle special characters
      const encodedEmail = encodeURIComponent(inviteEmail);
      const inviteUrl = `${window.location.origin}/auth?invite=${cardId}&email=${encodedEmail}&token=${invitationData.id}`;
      
      // Store invite URL for display
      setInvitationUrl(inviteUrl);
      setInvitationGenerated(true);
      
      toast({
        title: "Invitation Created",
        description: "Share the generated link with your contact",
      });
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Reset dialog state when closed
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      if (isLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Only reset if dialog is actually closing
      if (isOpen) {
        setTimeout(() => {
          setInvitationGenerated(false);
          setInvitationUrl('');
          setEmail('');
          setIsLoading(false);
        }, 300); // Slight delay to avoid visual glitch
      }
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            {invitationGenerated 
              ? "Share this link with the person you want to invite."
              : `Invite someone to access "${cardName}". They'll be able to view and add transactions to this card.`
            }
          </DialogDescription>
        </DialogHeader>
        
        {invitationGenerated ? (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Share this invitation link</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={invitationUrl} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This link will expire in 7 days and is specific to {email}
              </p>
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => {
                setInvitationGenerated(false);
                setInvitationUrl('');
                setEmail('');
              }}>
                Create New Invitation
              </Button>
              <Button variant="default" onClick={() => setIsOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
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
                    handleGenerateInvite();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateInvite} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
