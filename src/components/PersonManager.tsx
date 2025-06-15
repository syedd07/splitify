
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Crown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Person } from '@/types/BillSplitter';
import { supabase } from '@/integrations/supabase/client';

interface PersonManagerProps {
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
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
  const [newPersonName, setNewPersonName] = useState('');
  const [cardOwner, setCardOwner] = useState<any>(null);
  const [isCardMember, setIsCardMember] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if current user is card owner or member
  useEffect(() => {
    const checkUserRole = async () => {
      if (!selectedCard || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is the actual card owner
        const isOwner = selectedCard.user_id === currentUser.id;
        
        if (!isOwner) {
          setIsCardMember(true);
          // Try to fetch the actual card owner's profile
          const { data: ownerProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', selectedCard.user_id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching card owner profile:', error);
          }

          // If no profile found, create a fallback owner object
          if (!ownerProfile) {
            console.log('Card owner profile not found, using fallback data');
            setCardOwner({
              id: selectedCard.user_id,
              full_name: 'Card Owner',
              email: 'Card Owner'
            });
          } else {
            setCardOwner(ownerProfile);
          }
        } else {
          setIsCardMember(false);
          setCardOwner(userProfile);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        // Set fallback data if there's an error
        if (selectedCard.user_id !== currentUser.id) {
          setIsCardMember(true);
          setCardOwner({
            id: selectedCard.user_id,
            full_name: 'Card Owner',
            email: 'Card Owner'
          });
        } else {
          setCardOwner(userProfile);
        }
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [selectedCard, currentUser, userProfile]);

  // Initialize people from card's shared emails and members
  useEffect(() => {
    const initializePeople = async () => {
      if (!selectedCard || !cardOwner || loading) return;

      try {
        const peopleArray: Person[] = [];
        
        // Add card owner first
        peopleArray.push({
          id: cardOwner.id || 'card-owner',
          name: cardOwner.full_name || cardOwner.email || 'Card Owner',
          isCardOwner: true
        });

        // Get all card members (including invited users)
        const { data: cardMembers, error } = await supabase
          .from('card_members')
          .select(`
            user_id,
            role,
            profiles!inner(id, full_name, email)
          `)
          .eq('credit_card_id', selectedCard.id);

        if (error) {
          console.error('Error fetching card members:', error);
        }

        // Add card members (excluding the owner if they're already added)
        if (cardMembers) {
          cardMembers.forEach((member: any) => {
            const profile = member.profiles;
            if (profile && profile.id !== cardOwner.id) {
              peopleArray.push({
                id: profile.id,
                name: profile.full_name || profile.email,
                isCardOwner: false
              });
            }
          });
        }

        // Add shared email users (legacy support)
        const sharedEmails = Array.isArray(selectedCard.shared_emails) 
          ? selectedCard.shared_emails 
          : [];

        sharedEmails.forEach((email: string, index: number) => {
          if (email !== cardOwner.email) {
            // Check if this email is not already added as a member
            const existingPerson = peopleArray.find(person => 
              person.name === email || 
              (typeof person.name === 'string' && person.name.includes(email))
            );
            
            if (!existingPerson) {
              peopleArray.push({
                id: `shared-${index}`,
                name: email,
                isCardOwner: false
              });
            }
          }
        });

        // Ensure current user is in the list if they're a member but not already added
        if (isCardMember && userProfile) {
          const currentUserExists = peopleArray.some(person => 
            person.id === userProfile.id ||
            person.name === userProfile.full_name || 
            person.name === userProfile.email
          );
          
          if (!currentUserExists) {
            peopleArray.push({
              id: userProfile.id,
              name: userProfile.full_name || userProfile.email,
              isCardOwner: false
            });
          }
        }

        console.log('Setting people array:', peopleArray);
        setPeople(peopleArray);
      } catch (error) {
        console.error('Error initializing people:', error);
        // Set minimum people array with at least the card owner
        const fallbackPeople: Person[] = [
          {
            id: cardOwner.id || 'card-owner',
            name: cardOwner.full_name || cardOwner.email || 'Card Owner',
            isCardOwner: true
          }
        ];

        // Add current user if they're a member
        if (isCardMember && userProfile) {
          fallbackPeople.push({
            id: userProfile.id,
            name: userProfile.full_name || userProfile.email,
            isCardOwner: false
          });
        }

        setPeople(fallbackPeople);
      }
    };

    initializePeople();
  }, [selectedCard, cardOwner, isCardMember, userProfile, setPeople, loading]);

  const addPerson = () => {
    // Only card owner can add new people
    if (isCardMember) return;
    
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        isCardOwner: false
      };
      setPeople(prev => [...prev, newPerson]);
      setNewPersonName('');
    }
  };

  const removePerson = (id: string) => {
    // Only card owner can remove people, and can't remove themselves
    if (isCardMember || id === 'card-owner' || (cardOwner && id === cardOwner.id)) return;
    setPeople(prev => prev.filter(person => person.id !== id));
  };

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading people...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {isCardMember ? 'People in this Card' : 'Add People to Split'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCardMember && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter person's name"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPerson()}
            />
            <Button onClick={addPerson} disabled={!newPersonName.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isCardMember && (
          <p className="text-sm text-muted-foreground">
            As a card member, you can only record your own expenses. You cannot add or remove people.
          </p>
        )}

        {people.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              People ({people.length})
            </h4>
            {people.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{person.name}</span>
                  {person.isCardOwner && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Card Owner
                    </Badge>
                  )}
                  {!person.isCardOwner && isCardMember && person.id === userProfile?.id && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!person.isCardOwner && !isCardMember && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePerson(person.id)}
                      disabled={people.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {people.length < 2 && !isCardMember && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least 1 more person to start splitting bills
          </p>
        )}

        {people.length < 2 && isCardMember && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Waiting for more people to be added to this card...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonManager;
