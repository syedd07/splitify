
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
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
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

      // Check if user has access to this card
      const { data: userAccess } = await supabase
        .from('credit_cards')
        .select('user_id')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: memberAccess } = await supabase
        .from('card_members')
        .select('user_id')
        .eq('credit_card_id', cardId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userAccess && !memberAccess) {
        throw new Error('Access denied');
      }

      // Step 2: Fetch all members for the card
      const { data: membersData, error: membersError } = await supabase
        .from('card_members')
        .select('id, user_id, role, created_at')
        .eq('credit_card_id', cardId);

      if (membersError) throw membersError;

      // Step 3: Fetch card owner as well
      const { data: cardOwner, error: ownerError } = await supabase
        .from('credit_cards')
        .select('user_id')
        .eq('id', cardId)
        .single();

      if (ownerError) throw ownerError;

      // Step 4: Collect all unique user IDs
      const allUserIds = new Set<string>();
      
      // Add card owner
      allUserIds.add(cardOwner.user_id);
      
      // Add all members
      (membersData || []).forEach(member => {
        allUserIds.add(member.user_id);
      });

      // Step 5: Fetch profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', Array.from(allUserIds));

      if (profilesError) throw profilesError;

      // Create profiles map
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = {
          email: profile.email || '',
          full_name: profile.full_name
        };
        return acc;
      }, {} as Record<string, { email: string; full_name: string | null }>);

      // Step 6: Build members list including owner
      const allMembers: Member[] = [];

      // Add card owner first
      allMembers.push({
        id: `owner-${cardOwner.user_id}`,
        user_id: cardOwner.user_id,
        role: 'owner',
        created_at: new Date().toISOString(),
        profiles: profilesMap[cardOwner.user_id] || { email: '', full_name: null }
      });

      // Add other members (excluding owner if they're also in card_members)
      (membersData || []).forEach(member => {
        if (member.user_id !== cardOwner.user_id) {
          allMembers.push({
            ...member,
            profiles: profilesMap[member.user_id] || { email: '', full_name: null }
          });
        }
      });

      // Step 7: Fetch pending invitations
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
      <DialogContent className="sm:max-w-lg">
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
                Members ({members.length})
              </h4>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {member.profiles.full_name || member.profiles.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.profiles.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'owner' && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Owner
                        </Badge>
                      )}
                      {member.role === 'member' && (
                        <Badge variant="outline">Member</Badge>
                      )}
                      {member.user_id !== currentUserId && member.role !== 'owner' && !member.id.startsWith('owner-') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.profiles.email} from this card?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMember(member.id, member.profiles.email)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
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
