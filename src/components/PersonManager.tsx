
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

  // Check if current user is card owner or member
  useEffect(() => {
    const checkUserRole = async () => {
      if (!selectedCard || !currentUser) return;

      // Check if user is the actual card owner
      const isOwner = selectedCard.user_id === currentUser.id;
      
      if (!isOwner) {
        setIsCardMember(true);
        // Fetch the actual card owner's profile
        try {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', selectedCard.user_id)
            .single();
          
          setCardOwner(ownerProfile);
        } catch (error) {
          console.error('Error fetching card owner:', error);
        }
      } else {
        setIsCardMember(false);
        setCardOwner(userProfile);
      }
    };

    checkUserRole();
  }, [selectedCard, currentUser, userProfile]);

  // Initialize people from card's shared emails
  useEffect(() => {
    if (selectedCard && cardOwner) {
      const sharedEmails = Array.isArray(selectedCard.shared_emails) 
        ? selectedCard.shared_emails 
        : [];

      const peopleArray: Person[] = [];
      
      // Add card owner first
      peopleArray.push({
        id: cardOwner.id || 'card-owner',
        name: cardOwner.full_name || cardOwner.email || 'Card Owner',
        isCardOwner: true
      });

      // Add shared email users (excluding the owner's email)
      sharedEmails.forEach((email: string, index: number) => {
        if (email !== cardOwner.email) {
          peopleArray.push({
            id: `shared-${index}`,
            name: email,
            isCardOwner: false
          });
        }
      });

      // Add current user if they're not the owner and not already in the list
      if (isCardMember && userProfile) {
        const currentUserExists = peopleArray.some(person => 
          person.name === userProfile.full_name || person.name === userProfile.email
        );
        
        if (!currentUserExists) {
          peopleArray.push({
            id: userProfile.id,
            name: userProfile.full_name || userProfile.email,
            isCardOwner: false
          });
        }
      }

      setPeople(peopleArray);
    }
  }, [selectedCard, cardOwner, isCardMember, userProfile, setPeople]);

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
                  {!person.isCardOwner && isCardMember && person.name === (userProfile?.full_name || userProfile?.email) && (
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
      </CardContent>
    </Card>
  );
};

export default PersonManager;
