import React, { useState } from 'react';
import { Plus, Trash2, Receipt, Banknote, Calendar, CreditCard as CreditCardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';

interface TransactionEntryProps {
  people: Person[];
  creditCards: CreditCard[];
  selectedCard?: CreditCard | null;
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  transactions: Transaction[];
  month: string;
  year: string;
}

const TransactionEntry: React.FC<TransactionEntryProps> = ({
  people,
  creditCards,
  selectedCard,
  onAddTransaction,
  onDeleteTransaction,
  transactions,
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

  const handleAddExpense = () => {
    if (!amount || !description || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // For common expenses, spentBy is not required (will be split among all)
    // For personal expenses, spentBy is required
    if (category === 'personal' && !spentBy) {
      toast({
        title: "Missing Information",
        description: "Please select who spent this amount.",
        variant: "destructive"
      });
      return;
    }

    if (category === 'common') {
      // Get ALL people including card owner for splitting
      const allPeople = people;
      const splitAmount = parseFloat(amount) / allPeople.length;
      const baseTimestamp = Date.now();
      
      console.log('Common expense split calculation:');
      console.log('Total amount:', amount);
      console.log('Number of people:', allPeople.length);
      console.log('Split amount per person:', splitAmount);
      console.log('People involved:', allPeople.map(p => p.name));
      
      allPeople.forEach((person, index) => {
        const transaction: Omit<Transaction, 'id'> = {
          amount: splitAmount,
          description,
          date,
          type: 'expense',
          category: 'personal', // Store as personal but mark as common split
          spentBy: person.id,
          creditCardId: selectedCard?.id,
          isCommonSplit: true // Flag to identify this was originally a common expense
        };

        // Generate unique ID for each person by adding index to timestamp
        const uniqueId = `${baseTimestamp}-${index}-${person.id}`;
        onAddTransaction({ ...transaction, id: uniqueId } as Transaction);
        
        console.log(`Added transaction for ${person.name} with ID: ${uniqueId}, amount: ${splitAmount}`);
      });

      toast({
        title: "Common Expense Added",
        description: `₹${amount} expense for ${description} has been split equally among ${allPeople.length} people (₹${splitAmount.toFixed(2)} each).`
      });
    } else {
      // Personal expense
      const transaction: Omit<Transaction, 'id'> = {
        amount: parseFloat(amount),
        description,
        date,
        type: 'expense',
        category,
        spentBy,
        creditCardId: selectedCard?.id
      };

      onAddTransaction({ ...transaction, id: Date.now().toString() } as Transaction);
      toast({
        title: "Expense Added",
        description: `₹${amount} expense for ${description} has been recorded.`
      });
    }

    resetForm();
  };

  const handleAddPayment = () => {
    if (!amount || !description || !date || !spentBy) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to add a payment.",
        variant: "destructive"
      });
      return;
    }

    const transaction: Omit<Transaction, 'id'> = {
      amount: parseFloat(amount),
      description,
      date,
      type: 'payment',
      category: 'personal', // Payments are always personal
      spentBy
    };

    onAddTransaction({ ...transaction, id: Date.now().toString() } as Transaction);
    resetForm();
    toast({
      title: "Payment Added",
      description: `₹${amount} payment for ${description} has been recorded.`
    });
  };

  // Sort transactions by date in descending order (latest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseInt(a.date);
    const dateB = parseInt(b.date);
    return dateB - dateA; // Descending order (latest dates first)
  });

  const expenseTransactions = sortedTransactions.filter(t => t.type === 'expense');
  const paymentTransactions = sortedTransactions.filter(t => t.type === 'payment');

  // Get days in month for date selection
  const getDaysInMonth = () => {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  const getCreditCardDisplay = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    return card ? `${card.card_name} (*${card.last_four_digits})` : 'Unknown Card';
  };

  return (
    <div className="space-y-6">
      {/* Show selected card display */}
      {selectedCard && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Using: {selectedCard.card_name} (*{selectedCard.last_four_digits})
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="expense" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Add Expense
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            Add Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-4">
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
                      setSpentBy(''); // Clear spentBy when switching to common
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
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record Payment</CardTitle>
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
                  placeholder="Payment description (e.g., Credit card payment, UPI transfer)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Paid by</label>
                <Select value={spentBy} onValueChange={setSpentBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who made this payment?" />
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

              <Button onClick={handleAddPayment} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="expenses" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expenses">
                  Expenses ({expenseTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="payments">
                  Payments ({paymentTransactions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expenses" className="space-y-2 mt-4">
                {expenseTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No expenses recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {expenseTransactions.map(transaction => {
                      const person = people.find(p => p.id === transaction.spentBy);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transaction.description}</span>
                              <Badge 
                                variant={transaction.isCommonSplit ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {transaction.isCommonSplit ? 'Common Split' : transaction.category}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {person?.name} • {transaction.date} {month} {year}
                              {transaction.creditCardId && (
                                <span className="ml-2 text-blue-600">
                                  • {getCreditCardDisplay(transaction.creditCardId)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600">₹{transaction.amount.toFixed(2)}</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-2 mt-4">
                {paymentTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No payments recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {paymentTransactions.map(transaction => {
                      const person = people.find(p => p.id === transaction.spentBy);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transaction.description}</span>
                              <Badge variant="outline" className="text-xs border-green-600 text-green-600">
                                Payment
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {person?.name} • {transaction.date} {month} {year}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">₹{transaction.amount.toFixed(2)}</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransactionEntry;
