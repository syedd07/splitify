import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, UserCheck, Mail, Crown, User, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Person } from '@/types/BillSplitter';
import { supabase } from '@/integrations/supabase/client';
import InviteUserDialog from './InviteUserDialog';
import CardMembersDialog from './CardMembersDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CardMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  profile: {
    full_name: string | null;
    email: string;
  };
}

interface PersonManagerProps {
  people: Person[];
  setPeople: (people: Person[]) => void;
  cardOwnerName: string;
  userProfile: any;
  selectedCard: any;
  currentUser: any;
}

const PersonManager: React.FC<PersonManagerProps> = ({
  people,
  setPeople,
  cardOwnerName,
  userProfile,
  selectedCard,
  currentUser
}) => {
  const { toast } = useToast();
  const [newPersonName, setNewPersonName] = useState('');
  const [cardMembers, setCardMembers] = useState<CardMember[]>([]);
  const [showEmails, setShowEmails] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(false);

  // Get localStorage key for this card
  const getLocalStorageKey = () => `splitify_guests_${selectedCard?.id}`;

  // Load guests from localStorage
  const loadGuestsFromStorage = () => {
    if (!selectedCard?.id) return [];
    
    try {
      const stored = localStorage.getItem(getLocalStorageKey());
      if (stored) {
        const guests = JSON.parse(stored);
       // console.log('🔍 DEBUG - Loaded guests from localStorage:', guests);
        return guests.filter((person: Person) => person.id !== selectedCard.user_id); // Filter out card owner
      }
    } catch (error) {
      console.error('Error loading guests from localStorage:', error);
    }
    return [];
  };

  // Save guests to localStorage
  const saveGuestsToStorage = (guests: Person[]) => {
    if (!selectedCard?.id) return;
    
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(guests));
    //  console.log('💾 Saved guests to localStorage:', guests);
    } catch (error) {
      console.error('Error saving guests to localStorage:', error);
    }
  };

  // Remove guest from localStorage
  const removeGuestFromStorage = (guestId: string) => {
    const storedGuests = loadGuestsFromStorage();
    const updatedGuests = storedGuests.filter((guest: Person) => guest.id !== guestId);
    saveGuestsToStorage(updatedGuests);
  };

  // Fetch actual card members from card_members table
  const fetchCardMembers = async () => {
    if (!selectedCard?.id) {
     // console.log('No selected card ID');
      return;
    }

    try {
      setLoading(true);
      
      // First, get card members
      const { data: members, error: membersError } = await supabase
        .from('card_members')
        .select('id, user_id, role')
        .eq('credit_card_id', selectedCard.id)
        .order('role', { ascending: false });

      if (membersError) {
        console.error('Error fetching card members:', membersError);
        toast({
          title: "Error",
          description: "Failed to load card members",
          variant: "destructive"
        });
        return;
      }

      if (!members || members.length === 0) {
       // console.log('No card members found');
        setCardMembers([]);
        // Still load guests even if no card members
        const storedGuests = loadGuestsFromStorage();
        setPeople(storedGuests);
        return;
      }

      // Get user IDs to fetch profiles
      const userIds = members.map(m => m.user_id);
      
      // Then get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      //console.log('Fetched card members:', members);
     // console.log('Fetched profiles:', profiles);
      
      // Transform the data
      const transformedMembers: CardMember[] = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          id: member.id,
          user_id: member.user_id,
          role: member.role as 'owner' | 'member',
          profile: {
            full_name: profile?.full_name || null,
            email: profile?.email || 'Unknown'
          }
        };
      });

      setCardMembers(transformedMembers);

      // Convert to Person format for the split calculation
      const peopleForSplit: Person[] = transformedMembers.map(member => ({
        id: member.user_id, // Use user_id as the main ID for consistency
        name: member.profile.full_name || member.profile.email || 'Unknown User',
        isCardOwner: member.role === 'owner',
        role: member.role,
        email: member.profile.email,
        user_id: member.user_id // Keep user_id for reference
      }));

      // Load guests from localStorage and merge
      const storedGuests = loadGuestsFromStorage();
      // console.log('🔍 DEBUG - Merging card members with stored guests:', { peopleForSplit, storedGuests });
      
      setPeople([...peopleForSplit, ...storedGuests]);

    } catch (error) {
      console.error('Error in fetchCardMembers:', error);
      toast({
        title: "Error",
        description: "Failed to load card members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch card members when selectedCard changes
  useEffect(() => {
    fetchCardMembers();
  }, [selectedCard?.id]);

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: `guest_${Date.now()}`,
        name: newPersonName.trim(),
        isCardOwner: false,
        role: 'guest'
      };
      
      const updatedPeople = [...people, newPerson];
      setPeople(updatedPeople);
      
      // Save only guests to localStorage
      const guests = updatedPeople.filter(p => p.role === 'guest');
      saveGuestsToStorage(guests);
      
      setNewPersonName('');
      
      toast({
        title: "Person Added",
        description: `${newPerson.name} has been added to the split.`
      });
    }
  };

  const removePerson = (personId: string) => {
    const personToRemove = people.find(p => p.id === personId);
    
    // Can't remove card members (owner or member role)
    if (personToRemove && (personToRemove.role === 'owner' || personToRemove.role === 'member')) {
      toast({
        title: "Cannot Remove",
        description: "Cannot remove card members. Use card management to remove access.",
        variant: "destructive"
      });
      return;
    }

    const updatedPeople = people.filter(person => person.id !== personId);
    setPeople(updatedPeople);
    
    // Remove from localStorage if it's a guest
    if (personToRemove?.role === 'guest') {
      removeGuestFromStorage(personId);
    }
    
    toast({
      title: "Person Removed",
      description: `${personToRemove?.name} has been removed from the split.`
    });
  };

  const toggleEmailVisibility = (userId: string) => {
    setShowEmails(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-amber-600" />;
      case 'member':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="text-xs bg-amber-600 hover:bg-amber-700">Owner</Badge>;
      case 'member':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Member</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Guest</Badge>;
    }
  };

  // Helper function to safely get role from person
  const getPersonRole = (person: Person): string | undefined => {
    return 'role' in person ? person.role : undefined;
  };

  // Check if current user is card owner
  const currentUserRole = cardMembers.find(member => member.user_id === currentUser?.id)?.role;
  const isCardOwner = currentUserRole === 'owner';

  // Get guest people for display
  const guestPeople = people.filter(p => {
    const role = getPersonRole(p);
    return !role || role === 'guest';
  });

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-muted-foreground">Loading card members...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          People in this Split
          {currentUserRole && (
            <Badge variant={currentUserRole === 'owner' ? 'default' : 'secondary'} className="text-xs">
              You are a card {currentUserRole}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Card members are automatically included. Add additional people if needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Card Members Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserCheck className="w-4 h-4" />
            Card Members ({cardMembers.length})
          </div>
          
          {cardMembers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {cardMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50/50 to-green-50/50 hover:from-blue-100/50 hover:to-green-100/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.role)}
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {member.profile.full_name || member.profile.email}
                        </span>
                        {member.profile.full_name && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {showEmails[member.user_id] ? member.profile.email : 'Click to show email'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => toggleEmailVisibility(member.user_id)}
                            >
                              {showEmails[member.user_id] ? 
                                <EyeOff className="w-3 h-3" /> : 
                                <Eye className="w-3 h-3" />
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(member.role)}
                      {member.user_id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 border rounded-lg">
              <p className="text-sm text-muted-foreground">No card members found</p>
            </div>
          )}
        </div>

        {/* Guest People Warning */}
        {guestPeople.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Guest data is temporarily stored locally.</strong> Guests will be lost if you clear browser data. 
              Consider inviting them as card members for permanent access.
            </AlertDescription>
          </Alert>
        )}

        {/* Additional People Section */}
        {guestPeople.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Plus className="w-4 h-4" />
              Additional People ({guestPeople.length})
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {guestPeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 flex-1">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm">{person.name}</span>
                    <Badge variant="outline" className="text-xs">Guest</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Invite Guest Button - Only show for card owners */}
                    {isCardOwner && (
                      <InviteUserDialog
                        cardId={selectedCard.id}
                        cardName={selectedCard.card_name}
                        onInvitationChange={() => {
                          fetchCardMembers();
                          toast({
                            title: "Invitation Sent",
                            description: `Invitation sent to convert ${person.name} to a card member`,
                          });
                        }}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Invite
                          </Button>
                        }
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePerson(person.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new person section */}
        <div className="pt-4 border-t">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter person's name"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPerson()}
              className="flex-1"
            />
            <Button onClick={addPerson} disabled={!newPersonName.trim()}>
              <Plus className="w-4 w-4 mr-2" />
              Add Person
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Add additional people who will be part of this bill split (stored locally as guests)
          </p>
        </div>

        {/* Card management section - only for card owners */}
        {isCardOwner && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <InviteUserDialog 
                cardId={selectedCard.id}
                cardName={selectedCard.card_name}
                onInvitationChange={() => {
                  fetchCardMembers();
                  toast({
                    title: "Invitation Status Changed",
                    description: "The invitation has been updated",
                  });
                }}
                trigger={
                  <Button variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                }
              />
              <CardMembersDialog 
                cardId={selectedCard.id}
                cardName={selectedCard.card_name}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Manage who has access to this credit card and can add transactions
            </p>
          </div>
        )}

        {people.length < 2 && (
          <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              You need at least 2 people to split expenses. Add more people above.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonManager;
