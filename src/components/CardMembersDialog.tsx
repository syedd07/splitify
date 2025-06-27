import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Crown, UserMinus, Loader2, Clock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import InviteUserDialog from './InviteUserDialog';

interface Member {
  id: string;
  user_id?: string;
  email: string;
  role: string;
  created_at: string;
  full_name: string | null;
  source: 'owner' | 'shared_email' | 'card_member';
}

interface Invitation {
  id: string;
  invited_email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface CardMembersDialogProps {
  cardId: string;
  cardName: string;
  trigger?: React.ReactNode;
}

const CardMembersDialog: React.FC<CardMembersDialogProps> = ({
  cardId,
  cardName,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMembersAndInvitations();
    }
  }, [open, cardId]);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchMembersAndInvitations = async () => {
    setLoading(true);
    try {
      // Step 1: Check if user is card owner or has access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get card details including shared_emails
      const { data: cardData, error: cardError } = await supabase
        .from('credit_cards')
        .select('user_id, shared_emails')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      // Check if user has access to this card
      const userIsOwner = cardData.user_id === user.id;
      const userInSharedEmails = cardData.shared_emails && Array.isArray(cardData.shared_emails) 
        ? cardData.shared_emails.some((email: string) => email.toLowerCase() === user.email?.toLowerCase())
        : false;

      if (!userIsOwner && !userInSharedEmails) {
        throw new Error('Access denied');
      }

      // Step 2: Fetch card owner profile
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', cardData.user_id)
        .single();

      if (ownerError && ownerError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching owner profile:', ownerError);
      }

      const allMembers: Member[] = [];

      // Add card owner
      allMembers.push({
        id: `owner-${cardData.user_id}`,
        user_id: cardData.user_id,
        email: ownerProfile?.email || 'Unknown',
        full_name: ownerProfile?.full_name || null,
        role: 'owner',
        created_at: new Date().toISOString(),
        source: 'owner'
      });

      // Step 3: Process shared_emails
      if (cardData.shared_emails && Array.isArray(cardData.shared_emails)) {
        for (let i = 0; i < cardData.shared_emails.length; i++) {
          const email = cardData.shared_emails[i];
          
          // Try to find profile for this email
          const { data: emailProfile } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', (email as string).toLowerCase())
            .maybeSingle();

          allMembers.push({
            id: `shared-${i}`,
            user_id: emailProfile?.id,
            email: String(email),
            full_name: emailProfile?.full_name || null,
            role: 'member',
            created_at: new Date().toISOString(),
            source: 'shared_email'
          });
        }
      }

      // Step 4: Fetch additional card_members (if any exist)
      const { data: cardMembers } = await supabase
        .from('card_members')
        .select('id, user_id, role, created_at')
        .eq('credit_card_id', cardId);

      if (cardMembers && cardMembers.length > 0) {
        const memberUserIds = cardMembers.map(m => m.user_id);
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', memberUserIds);

        const profilesMap = (memberProfiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);

        cardMembers.forEach(member => {
          // Don't duplicate if already in shared_emails or is owner
          const isDuplicate = allMembers.some(m => 
            m.user_id === member.user_id || 
            (profilesMap[member.user_id] && m.email === profilesMap[member.user_id].email)
          );

          if (!isDuplicate) {
            const profile = profilesMap[member.user_id];
            allMembers.push({
              id: member.id,
              user_id: member.user_id,
              email: profile?.email || 'Unknown',
              full_name: profile?.full_name || null,
              role: member.role,
              created_at: member.created_at,
              source: 'card_member'
            });
          }
        });
      }

      // Step 5: Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('card_invitations')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('status', 'pending');

      if (invitationsError) throw invitationsError;

      setMembers(allMembers);
      setInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load members and invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeSharedEmail = async (memberEmail: string, memberIndex: number) => {
    try {
      // Get current card data
      const { data: cardData, error: cardError } = await supabase
        .from('credit_cards')
        .select('shared_emails')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      // Remove email from shared_emails array
      let updatedSharedEmails = [];
      if (cardData.shared_emails && Array.isArray(cardData.shared_emails)) {
        updatedSharedEmails = cardData.shared_emails.filter((email: string) => 
          email.toLowerCase() !== memberEmail.toLowerCase()
        );
      }

      // Update the card
      const { error: updateError } = await supabase
        .from('credit_cards')
        .update({ shared_emails: updatedSharedEmails })
        .eq('id', cardId);

      if (updateError) throw updateError;

      toast({
        title: "Access Revoked",
        description: `${memberEmail} no longer has access to ${cardName}`,
      });

      fetchMembersAndInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string, memberEmail: string) => {
    try {
      const { error } = await supabase
        .from('card_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${memberEmail} has been removed from ${cardName}`,
      });

      fetchMembersAndInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('card_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Invitation cancelled",
        description: `Invitation to ${email} has been cancelled`,
      });

      fetchMembersAndInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

  const handleInvitationChange = () => {
    // Refresh the data when invitations change
    fetchMembersAndInvitations();
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Users className="w-4 h-4 mr-2" />
      Members ({members.length})
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            {cardName} - Members & Invitations
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Members Section */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Current Members ({members.length})
              </h4>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={`${member.source}-${member.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {member.full_name || member.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'owner' && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Owner
                        </Badge>
                      )}
                      {member.role === 'member' && member.source === 'shared_email' && (
                        <Badge variant="outline" className="bg-green-50">
                          <Mail className="w-3 h-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                      {member.role === 'member' && member.source === 'card_member' && (
                        <Badge variant="outline">Member</Badge>
                      )}
                      
                      {/* Remove button for non-owners and non-current-user */}
                      {member.user_id !== currentUserId && member.role !== 'owner' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke access for {member.email}? 
                                They will no longer be able to view or add transactions to this card.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (member.source === 'shared_email') {
                                    const index = parseInt(member.id.split('-')[1]);
                                    removeSharedEmail(member.email, index);
                                  } else {
                                    removeMember(member.id, member.email);
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Revoke Access
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Invitations ({invitations.length})
                </h4>
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50"
                    >
                      <div>
                        <p className="font-medium">{invitation.invited_email}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-yellow-100">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel the invitation to {invitation.invited_email}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelInvitation(invitation.id, invitation.invited_email)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Cancel Invitation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite New User */}
            <div className="pt-4 border-t">
              <InviteUserDialog
                cardId={cardId}
                cardName={cardName}
                onInvitationChange={handleInvitationChange}
                trigger={
                  <Button className="w-full">
                    <Mail className="w-4 h-4 mr-2" />
                    Invite New User
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CardMembersDialog;
