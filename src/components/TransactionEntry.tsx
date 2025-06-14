
import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, Tag, Users, Trash2, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  const [transactionType, setTransactionType] = useState<'expense' | 'payment'>('expense');
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
        type: transactionType,
        category: transactionType === 'payment' ? 'personal' : category,
        spentBy: transactionType === 'expense' && category === 'common' ? 'common' : spentBy,
        splitBetween: transactionType === 'expense' && category === 'common' ? people.map(p => p.id) : undefined
      };
      onAddTransaction(transaction);
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

  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);

  // Group transactions for display
  const displayTransactions = transactions.reduce((acc: Transaction[], transaction) => {
    if (transaction.isCommonSplit) {
      const existingCommon = acc.find(t => 
        t.description === transaction.description && 
        t.date === transaction.date && 
        t.category === 'common' &&
        !t.isCommonSplit
      );
      
      if (!existingCommon) {
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

  const expenseTransactions = displayTransactions.filter(t => t.type === 'expense');
  const paymentTransactions = displayTransactions.filter(t => t.type === 'payment');

  return (
    <div className="space-y-6">
      <Tabs value={transactionType} onValueChange={(value: 'expense' | 'payment') => {
        setTransactionType(value);
        setCategory('personal');
        setSpentBy('');
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Add Expense
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            Record Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-4">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Add New Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
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

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Record Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Payment Amount (₹)
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
                      Payment Date
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
                    Payment Description
                  </Label>
                  <Input
                    id="description"
                    placeholder="e.g., Partial payment, Full settlement, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Who made this payment?
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

                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">
                    This payment will reduce the selected person's outstanding balance.
                  </p>
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Summary */}
      {displayTransactions.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">₹{totalExpenses.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Expenses</div>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">₹{totalPayments.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Payments</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">₹{(totalExpenses - totalPayments).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Outstanding Balance</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
            
            {expenseTransactions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Expenses ({expenseTransactions.length})
                </h4>
                {expenseTransactions.map((transaction) => (
                  <Card key={transaction.id} className="transition-all hover:shadow-md border-blue-100">
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
                          <div className="text-lg font-semibold text-blue-600">
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
                                  onClick={() => {
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
                                  }}
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
            )}

            {paymentTransactions.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Payments ({paymentTransactions.length})
                </h4>
                {paymentTransactions.map((transaction) => (
                  <Card key={transaction.id} className="transition-all hover:shadow-md border-green-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{transaction.description}</span>
                            <Badge variant="outline" className="border-green-600 text-green-600">
                              Payment
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
                                <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => onDeleteTransaction(transaction.id)}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionEntry;
