
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
}

const PersonManager: React.FC<PersonManagerProps> = ({ people, setPeople, cardOwnerName }) => {
  const [newPersonName, setNewPersonName] = useState('');
  const [actualCardOwnerName, setActualCardOwnerName] = useState('');

  // Fetch the actual user name from the database
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          setActualCardOwnerName(profile.full_name);
        } else {
          // Fallback to user metadata or email
          setActualCardOwnerName(user.user_metadata?.full_name || user.email || 'Card Owner');
        }
      }
    };

    fetchUserProfile();
  }, []);

  // Add card owner as first person when component mounts
  useEffect(() => {
    if (people.length === 0 && actualCardOwnerName) {
      const cardOwner: Person = {
        id: 'card-owner',
        name: actualCardOwnerName,
        isCardOwner: true
      };
      setPeople([cardOwner]);
    }
  }, [actualCardOwnerName, people.length, setPeople]);

  // Update card owner name if it changes
  useEffect(() => {
    if (actualCardOwnerName && people.length > 0) {
      setPeople(prev => prev.map(person => 
        person.id === 'card-owner' 
          ? { ...person, name: actualCardOwnerName }
          : person
      ));
    }
  }, [actualCardOwnerName, setPeople]);

  const addPerson = () => {
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
    // Don't allow removing the card owner
    if (id === 'card-owner') return;
    setPeople(prev => prev.filter(person => person.id !== id));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Add People to Split
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                </div>
                <div className="flex items-center gap-2">
                  {!person.isCardOwner && (
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

        {people.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least 1 more person to start splitting bills
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonManager;
