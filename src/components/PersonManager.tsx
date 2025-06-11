
import React, { useState } from 'react';
import { Plus, Users, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Person } from '@/types/BillSplitter';

interface PersonManagerProps {
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
}

const PersonManager: React.FC<PersonManagerProps> = ({ people, setPeople }) => {
  const [newPersonName, setNewPersonName] = useState('');
  const { toast } = useToast();

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        isCardOwner: people.length === 0 // First person is card owner
      };
      setPeople(prev => [...prev, newPerson]);
      setNewPersonName('');
      toast({
        title: "Person Added",
        description: `${newPerson.name} has been added to the group${newPerson.isCardOwner ? ' as the card owner' : ''}.`,
      });
    }
  };

  const removePerson = (id: string) => {
    const personToRemove = people.find(p => p.id === id);
    if (personToRemove?.isCardOwner && people.length > 1) {
      toast({
        title: "Cannot Remove Card Owner",
        description: "You cannot remove the card owner. Transfer ownership to someone else first.",
        variant: "destructive",
      });
      return;
    }
    
    setPeople(prev => prev.filter(person => person.id !== id));
    toast({
      title: "Person Removed",
      description: `${personToRemove?.name} has been removed from the group.`,
    });
  };

  const setCardOwner = (id: string) => {
    setPeople(prev => prev.map(person => ({
      ...person,
      isCardOwner: person.id === id
    })));
    const newOwner = people.find(p => p.id === id);
    toast({
      title: "Card Owner Changed",
      description: `${newOwner?.name} is now the card owner.`,
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Who's splitting the bill?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addPerson} className="flex gap-2">
          <Input
            placeholder="Enter person's name"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newPersonName.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </form>

        {people.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">People ({people.length})</h4>
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{person.name}</span>
                    {person.isCardOwner && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Card Owner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!person.isCardOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCardOwner(person.id)}
                      >
                        Make Owner
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePerson(person.id)}
                      disabled={people.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {people.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            Add at least 2 people to start splitting bills
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonManager;
