
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';

interface ExpenseFormProps {
  people: Person[];
  selectedCard?: CreditCard | null;
  onAddTransaction: (transaction: Transaction) => void;
  month: string;
  year: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  people,
  selectedCard,
  onAddTransaction,
  month,
  year
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [spentBy, setSpentBy] = useState('');
  const [category, setCategory] = useState<'personal' | 'common'>('personal');

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate('');
    setSpentBy('');
    setCategory('personal');
  };

  const getDaysInMonth = () => {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  const handleAddExpense = () => {
    if (!amount || !description || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (category === 'personal' && !spentBy) {
      toast({
        title: "Missing Information",
        description: "Please select who spent this amount.",
        variant: "destructive"
      });
      return;
    }

    if (category === 'common') {
      const totalAmount = parseFloat(amount);
      const splitAmount = totalAmount / people.length;
      
      console.log('=== COMMON EXPENSE SPLIT DEBUG ===');
      console.log('Total amount entered:', totalAmount);
      console.log('Number of people:', people.length);
      console.log('Split amount per person:', splitAmount);
      console.log('People list:', people.map(p => ({ id: p.id, name: p.name })));
      
      // Create individual transactions for each person
      people.forEach((person, index) => {
        const uniqueId = `common-${Date.now()}-${index}-${person.id}`;
        
        const transaction: Transaction = {
          id: uniqueId,
          amount: splitAmount,
          description: `${description} (Common Split)`,
          date,
          type: 'expense',
          category: 'personal', // Individual portion of common expense
          spentBy: person.id,
          creditCardId: selectedCard?.id,
          isCommonSplit: true
        };

        console.log(`Creating transaction ${index + 1}:`, {
          id: transaction.id,
          person: person.name,
          amount: transaction.amount,
          spentBy: transaction.spentBy
        });

        // Add each transaction individually with a small delay to ensure unique IDs
        setTimeout(() => {
          onAddTransaction(transaction);
        }, index * 10);
      });

      toast({
        title: "Common Expense Added",
        description: `₹${totalAmount} expense for ${description} has been split equally among ${people.length} people (₹${splitAmount.toFixed(2)} each).`
      });

      console.log('=== END COMMON EXPENSE SPLIT DEBUG ===');
    } else {
      const transaction: Transaction = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        date,
        type: 'expense',
        category,
        spentBy,
        creditCardId: selectedCard?.id
      };

      onAddTransaction(transaction);
      toast({
        title: "Expense Added",
        description: `₹${amount} expense for ${description} has been recorded.`
      });
    }

    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Record Expense</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount (₹)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger>
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {getDaysInMonth().map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Input
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Spent by {category === 'common' && '(Will be split equally)'}
            </label>
            <Select 
              value={spentBy} 
              onValueChange={setSpentBy}
              disabled={category === 'common'}
            >
              <SelectTrigger className={category === 'common' ? 'opacity-50' : ''}>
                <SelectValue placeholder={
                  category === 'common' 
                    ? "Split among all people" 
                    : "Who spent this?"
                } />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name} {person.isCardOwner && '(Card Owner)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select value={category} onValueChange={(value: 'personal' | 'common') => {
              setCategory(value);
              if (value === 'common') {
                setSpentBy('');
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="common">Common (Split Equally)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleAddExpense} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
