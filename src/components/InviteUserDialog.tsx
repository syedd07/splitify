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
import { Loader2, Link as LinkIcon, Copy, CheckCircle2, Trash2, Clock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InviteUserDialogProps {
  cardId: string;
  cardName: string;
  trigger: React.ReactNode;
  onInvitationChange?: () => void;
}

interface PendingInvitation {
  id: string;
  invited_email: string;
  expires_at: string;
  created_at: string;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  cardId,
  cardName,
  trigger,
  onInvitationChange
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [invitationGenerated, setInvitationGenerated] = useState(false);
  const [invitationId, setInvitationId] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const { toast } = useToast();

  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load pending invitations when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadPendingInvitations();
    }
  }, [isOpen, cardId]);

  const loadPendingInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const { data: invitations, error } = await supabase
        .from('card_invitations')
        .select('id, invited_email, expires_at, created_at')
        .eq('credit_card_id', cardId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingInvitations(invitations || []);
    } catch (error: any) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const generateInviteUrl = (invitationId: string, email: string) => {
    const encodedEmail = encodeURIComponent(email);
    return `${window.location.origin}/auth?invite=${cardId}&email=${encodedEmail}&token=${invitationId}`;
  };

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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      const inviteEmail = email.toLowerCase().trim();

      if (inviteEmail === user.email?.toLowerCase()) {
        toast({
          title: "Error",
          description: "You cannot invite yourself",
          variant: "destructive",
        });
        return;
      }

      const { data: cardData, error: cardError } = await supabase
        .from('credit_cards')
        .select('shared_emails, user_id')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      if (cardData.user_id !== user.id) {
        toast({
          title: "Error",
          description: "Only card owners can send invitations",
          variant: "destructive",
        });
        return;
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvite, error: checkError } = await supabase
        .from('card_invitations')
        .select('id')
        .eq('credit_card_id', cardId)
        .eq('invited_email', inviteEmail)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingInvite) {
        toast({
          title: "Error",
          description: "An invitation is already pending for this email address",
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
        
      if (inviteError) throw inviteError;

      const inviteUrl = generateInviteUrl(invitationData.id, inviteEmail);
      
      setInvitationUrl(inviteUrl);
      setInvitationId(invitationData.id);
      setInvitationGenerated(true);
      
      // Refresh pending invitations list
      await loadPendingInvitations();
      
      if (onInvitationChange) {
        onInvitationChange();
      }
      
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

  const handleCancelInvitation = async (invitationIdToCancel: string, emailToCancel: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('card_invitations')
        .delete()
        .eq('id', invitationIdToCancel);

      if (error) throw error;

      toast({
        title: "Invitation Cancelled",
        description: `Invitation to ${emailToCancel} has been cancelled`,
      });

      // If this was the currently generated invitation, reset the form
      if (invitationIdToCancel === invitationId) {
        setInvitationGenerated(false);
        setInvitationUrl('');
        setInvitationId('');
        setEmail('');
      }

      // Refresh pending invitations list
      await loadPendingInvitations();

      if (onInvitationChange) {
        onInvitationChange();
      }
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteUrl = (invitationId: string, email: string) => {
    const url = generateInviteUrl(invitationId, email);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Link Copied",
      description: `Invitation link for ${email} copied to clipboard`,
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Link Copied",
      description: "Invitation link has been copied to clipboard",
    });
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      if (isLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (isOpen) {
        setTimeout(() => {
          setInvitationGenerated(false);
          setInvitationUrl('');
          setInvitationId('');
          setEmail('');
          setIsLoading(false);
          setCopied(false);
        }, 300);
      }
    }
    setIsOpen(open);
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month}, ${year}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            {invitationGenerated 
              ? "Invitation created! You can copy the link again or cancel the invitation."
              : `Invite someone to access "${cardName}". They'll be able to view and add transactions to this card.`
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Existing Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Invitations ({pendingInvitations.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPendingInvitations}
                disabled={loadingInvitations}
              >
                <RefreshCw className={`w-4 h-4 ${loadingInvitations ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={`flex items-center justify-between p-2 border rounded-lg text-sm ${
                    isExpired(invitation.expires_at) ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invitation.invited_email}</span>
                    {isExpired(invitation.expires_at) ? (
                      <Badge variant="destructive" className="text-xs">Expired</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-yellow-100">
                        Expires: {formatExpiryDate(invitation.expires_at)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isExpired(invitation.expires_at) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteUrl(invitation.id, invitation.invited_email)}
                        title="Copy invite link"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id, invitation.invited_email)}
                      disabled={isLoading}
                      className="text-red-600"
                      title="Cancel invitation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {invitationGenerated ? (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>New Invitation Link for: {email}</Label>
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
                  title="Copy link"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This link will expire in 7 days and is specific to {email}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setInvitationGenerated(false);
                  setInvitationUrl('');
                  setInvitationId('');
                  setEmail('');
                }}
                className="flex-1"
              >
                Create New Invitation
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => handleCancelInvitation(invitationId, email)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel Invitation
                  </>
                )}
              </Button>
              
              <Button 
                variant="default" 
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
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
