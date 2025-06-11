import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, Tag, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person } from '@/types/BillSplitter';

interface TransactionEntryProps {
  people: Person[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  transactions: Transaction[];
  month: string;
  year: string;
}

const TransactionEntry: React.FC<TransactionEntryProps> = ({ 
  people, 
  onAddTransaction,
  onDeleteTransaction,
  transactions,
  month,
  year
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'personal' | 'common'>('personal');
  const [spentBy, setSpentBy] = useState('');
  
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description && date && (category === 'common' || spentBy)) {
      const transaction: Transaction = {
        id: '',
        amount: parseFloat(amount),
        description,
        date,
        category,
        spentBy: category === 'common' ? 'common' : spentBy,
        splitBetween: category === 'common' ? people.map(p => p.id) : undefined
      };
      onAddTransaction(transaction);
      
      // Show success toast
      toast({
        title: "Transaction Added",
        description: `${category === 'common' ? 'Common expense' : 'Personal expense'} of ₹${parseFloat(amount).toFixed(2)} added successfully.`,
      });
      
      setAmount('');
      setDescription('');
      setDate('');
      setSpentBy('');
    }
  };

  const getPersonName = (id: string) => {
    if (id === 'common') return 'Common Expense';
    return people.find(p => p.id === id)?.name || '';
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Group transactions by original common transactions
  const displayTransactions = transactions.reduce((acc: Transaction[], transaction) => {
    if (transaction.isCommonSplit) {
      // Check if we already have this common transaction in our display list
      const existingCommon = acc.find(t => 
        t.description === transaction.description && 
        t.date === transaction.date && 
        t.category === 'common' &&
        !t.isCommonSplit
      );
      
      if (!existingCommon) {
        // Create a display version of the common transaction
        const originalAmount = people.length * transaction.amount;
        acc.push({
          ...transaction,
          id: `common-${transaction.description}-${transaction.date}`,
          amount: originalAmount,
          spentBy: 'common',
          isCommonSplit: false
        });
      }
    } else {
      acc.push(transaction);
    }
    return acc;
  }, []);

  const handleDeleteTransaction = (transaction: Transaction) => {
    if (transaction.category === 'common') {
      const relatedTransactions = transactions.filter(t => 
        t.description === transaction.description && 
        t.date === transaction.date && 
        t.isCommonSplit
      );
      relatedTransactions.forEach(t => onDeleteTransaction(t.id));
    } else {
      onDeleteTransaction(transaction.id);
    }
    
    toast({
      title: "Transaction Deleted",
      description: `${transaction.description} has been removed from your expenses.`,
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amount (₹)
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
              type="number"
              min="1"
              max="31"
              placeholder="DD"
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

        <div className="space-y-3">
          <Label>Category</Label>
          <RadioGroup value={category} onValueChange={(value: 'personal' | 'common') => {
            setCategory(value);
            if (value === 'common') {
              setSpentBy('');
            }
          }}>
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

        {category === 'personal' && (
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
        )}

        {category === 'common' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">
              This expense will be split equally among all {people.length} people (₹{amount ? (parseFloat(amount) / people.length).toFixed(2) : '0.00'} each)
            </p>
          </div>
        )}

        <Button type="submit" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </form>

      {/* Transaction List */}
      {displayTransactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Transactions ({displayTransactions.length})</h3>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Total: ₹{totalAmount.toFixed(2)}
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayTransactions.map((transaction) => (
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
                        {getPersonName(transaction.spentBy)} • {transaction.date} {month} {year}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-green-600">
                        ₹{transaction.amount.toFixed(2)}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this transaction? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteTransaction(transaction)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
