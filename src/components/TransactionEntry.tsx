
import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Transaction, Person } from '@/types/BillSplitter';

interface TransactionEntryProps {
  people: Person[];
  onAddTransaction: (transaction: Transaction) => void;
  transactions: Transaction[];
}

const TransactionEntry: React.FC<TransactionEntryProps> = ({ 
  people, 
  onAddTransaction, 
  transactions 
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'personal' | 'common'>('personal');
  const [spentBy, setSpentBy] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description && date && spentBy) {
      const transaction: Transaction = {
        id: '',
        amount: parseFloat(amount),
        description,
        date,
        category,
        spentBy,
        splitBetween: category === 'common' ? people.map(p => p.id) : undefined
      };
      onAddTransaction(transaction);
      setAmount('');
      setDescription('');
      setDate('');
      setSpentBy('');
    }
  };

  const getPersonName = (id: string) => {
    return people.find(p => p.id === id)?.name || '';
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Description
          </Label>
          <Input
            id="description"
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Who spent this?
          </Label>
          <Select value={spentBy} onValueChange={setSpentBy}>
            <SelectTrigger>
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                  {person.isCardOwner && ' (Card Owner)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Category</Label>
          <RadioGroup value={category} onValueChange={(value: 'personal' | 'common') => setCategory(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="personal" id="personal" />
              <Label htmlFor="personal">Personal Expense</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="common" id="common" />
              <Label htmlFor="common">Common Expense (Split Equally)</Label>
            </div>
          </RadioGroup>
        </div>

        <Button type="submit" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </form>

      {/* Transaction List */}
      {transactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Transactions ({transactions.length})</h3>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Total: ${totalAmount.toFixed(2)}
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{transaction.description}</span>
                        <Badge variant={transaction.category === 'common' ? 'default' : 'secondary'}>
                          {transaction.category === 'common' ? 'Common' : 'Personal'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getPersonName(transaction.spentBy)} • {transaction.date}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      ${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionEntry;
