
import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, UserCheck, Mail } from 'lucide-react';
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
  const [cardOwnerProfile, setCardOwnerProfile] = useState<any>(null);

  // Fetch card owner profile when selectedCard changes
  useEffect(() => {
    const fetchCardOwnerProfile = async () => {
      if (!selectedCard?.user_id) {
        console.log('No card owner user_id found');
        return;
      }

      try {
        console.log('Fetching card owner profile for user_id:', selectedCard.user_id);
        const { data: ownerProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', selectedCard.user_id)
          .single();

        if (error) {
          console.error('Error fetching card owner profile:', error);
          return;
        }

        console.log('Card owner profile found:', ownerProfile);
        setCardOwnerProfile(ownerProfile);
      } catch (error) {
        console.error('Error in fetchCardOwnerProfile:', error);
      }
    };

    fetchCardOwnerProfile();
  }, [selectedCard?.user_id]);

  // Initialize people array when card is selected or card owner profile is loaded
  useEffect(() => {
    if (!selectedCard) return;

    console.log('Initializing people array for card:', selectedCard.id);
    console.log('Card owner profile:', cardOwnerProfile);
    console.log('Selected card shared_emails:', selectedCard.shared_emails);

    const newPeople: Person[] = [];

    // Add card owner as first person
    const ownerName = cardOwnerProfile?.full_name || cardOwnerProfile?.email || 'Card Owner';
    console.log('Adding card owner:', ownerName, 'with ID:', selectedCard.user_id);
    
    newPeople.push({
      id: selectedCard.user_id, // Use actual user_id as the ID
      name: ownerName,
      isCardOwner: true
    });

    // Add shared emails as additional people
    if (selectedCard.shared_emails && Array.isArray(selectedCard.shared_emails)) {
      selectedCard.shared_emails.forEach((email: string, index: number) => {
        console.log('Adding shared email:', email, 'with ID:', `shared-${index}`);
        newPeople.push({
          id: `shared-${index}`, // Keep the shared-X format for shared emails
          name: email,
          isCardOwner: false
        });
      });
    }

    console.log('Setting people array:', newPeople);
    setPeople(newPeople);
  }, [selectedCard, cardOwnerProfile, setPeople]);

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        isCardOwner: false
      };
      
      console.log('Adding new person:', newPerson);
      setPeople([...people, newPerson]);
      setNewPersonName('');
      
      toast({
        title: "Person Added",
        description: `${newPerson.name} has been added to the split.`
      });
    }
  };

  const removePerson = (personId: string) => {
    const personToRemove = people.find(p => p.id === personId);
    
    if (personToRemove?.isCardOwner) {
      toast({
        title: "Cannot Remove",
        description: "Cannot remove the card owner from the split.",
        variant: "destructive"
      });
      return;
    }

    if (personToRemove && personToRemove.id.startsWith('shared-')) {
      toast({
        title: "Cannot Remove",
        description: "Cannot remove invited users. Use card management to remove shared access.",
        variant: "destructive"
      });
      return;
    }

    const updatedPeople = people.filter(person => person.id !== personId);
    setPeople(updatedPeople);
    
    toast({
      title: "Person Removed",
      description: `${personToRemove?.name} has been removed from the split.`
    });
  };

  // Check if current user is card owner
  const isCardOwner = selectedCard && currentUser && selectedCard.user_id === currentUser.id;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          People in this Split
          {!isCardOwner && (
            <Badge variant="secondary" className="text-xs">
              You are a card member
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {people.map((person) => (
            <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {person.isCardOwner ? (
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  ) : person.id.startsWith('shared-') ? (
                    <Mail className="w-4 h-4 text-green-600" />
                  ) : (
                    <Users className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="font-medium text-sm">{person.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {person.isCardOwner && (
                    <Badge variant="default" className="text-xs">Owner</Badge>
                  )}
                  {person.id.startsWith('shared-') && (
                    <Badge variant="secondary" className="text-xs">Invited</Badge>
                  )}
                </div>
              </div>
              {!person.isCardOwner && !person.id.startsWith('shared-') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removePerson(person.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add new person section - only for manual additions */}
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
              <Plus className="w-4 h-4 mr-2" />
              Add Person
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Add additional people who will be part of this bill split (beyond card members)
          </p>
        </div>

        {/* Card management section - only for card owners */}
        {isCardOwner && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <InviteUserDialog 
                selectedCard={selectedCard}
                onInviteSuccess={() => {
                  toast({
                    title: "Invitation Sent",
                    description: "The user has been invited to access this card."
                  });
                }}
              />
              <CardMembersDialog selectedCard={selectedCard} />
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
