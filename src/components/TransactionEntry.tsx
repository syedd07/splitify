import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Receipt, Banknote, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person } from '@/types/BillSplitter';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [spentBy, setSpentBy] = useState('');
  const [category, setCategory] = useState<'personal' | 'common'>('personal');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Check user's role for the current card
      const storedCard = localStorage.getItem('selectedCard');
      if (storedCard && user) {
        const selectedCard = JSON.parse(storedCard);
        
        // Check if user is the card owner
        if (selectedCard.user_id === user.id) {
          setUserRole('owner');
        } else {
          // Check user's member role
          const { data: memberData } = await supabase
            .from('card_members')
            .select('role')
            .eq('credit_card_id', selectedCard.id)
            .eq('user_id', user.id)
            .single();
          
          if (memberData) {
            setUserRole(memberData.role);
          }
        }
      }
    };

    getCurrentUser();
  }, []);

  const saveTransactionToDB = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const storedCard = localStorage.getItem('selectedCard');
      if (!storedCard) {
        throw new Error('No credit card selected');
      }

      const selectedCard = JSON.parse(storedCard);

      const dbTransaction = {
        user_id: user.id,
        credit_card_id: selectedCard.id,
        amount: transaction.amount,
        description: transaction.description,
        transaction_date: `${year}-${String(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month) + 1).padStart(2, '0')}-${String(transaction.date).padStart(2, '0')}`,
        transaction_type: transaction.type,
        category: transaction.category,
        spent_by_person_name: transaction.spentBy,
        month: month,
        year: year,
        is_common_split: transaction.isCommonSplit || false
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(dbTransaction)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  };

  const deleteTransactionFromDB = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate('');
    setSpentBy('');
    setCategory('personal');
  };

  const canAddTransactionForPerson = (personId: string) => {
    // Card owners can add transactions for anyone
    if (userRole === 'owner') return true;
    
    // Members can only add transactions for themselves
    const currentUserPerson = people.find(p => p.id === currentUser?.id || 
      (p.name && currentUser?.user_metadata?.full_name === p.name) ||
      (p.name && currentUser?.email && p.name.includes(currentUser.email)));
    return currentUserPerson?.id === personId;
  };

  const canDeleteTransaction = (transaction: Transaction) => {
    // Card owners can delete any transaction
    if (userRole === 'owner') return true;
    
    // Members can only delete their own transactions
    const currentUserPerson = people.find(p => p.id === currentUser?.id || 
      (p.name && currentUser?.user_metadata?.full_name === p.name) ||
      (p.name && currentUser?.email && p.name.includes(currentUser.email)));
    return transaction.spentBy === currentUserPerson?.id;
  };

  const getAvailablePeople = () => {
    if (userRole === 'owner') {
      return people; // Owners can select anyone
    }
    
    // Members can only select themselves
    const currentUserPerson = people.find(p => p.id === currentUser?.id || 
      (p.name && currentUser?.user_metadata?.full_name === p.name) ||
      (p.name && currentUser?.email && p.name.includes(currentUser.email)));
    return currentUserPerson ? [currentUserPerson] : [];
  };

  const handleAddExpense = async () => {
    if (!amount || !description || !date || (category === 'personal' && !spentBy)) {
      toast({
        title: "Missing Information",
        description: category === 'common' 
          ? "Please fill in amount, description, and date to add a common expense."
          : "Please fill in all fields to add an expense.",
        variant: "destructive"
      });
      return;
    }

    if (category === 'personal' && !canAddTransactionForPerson(spentBy)) {
      toast({
        title: "Permission denied",
        description: "You can only add transactions for yourself.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const transaction: Omit<Transaction, 'id'> = {
        amount: parseFloat(amount),
        description,
        date,
        type: 'expense',
        category,
        spentBy: category === 'common' ? 'common' : spentBy
      };

      const dbTransactionId = await saveTransactionToDB(transaction);
      onAddTransaction({ ...transaction, id: dbTransactionId } as Transaction);
      
      resetForm();
      toast({
        title: "Expense Added",
        description: category === 'common' 
          ? `₹${amount} common expense for ${description} has been recorded and will be split equally.`
          : `₹${amount} expense for ${description} has been recorded.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!amount || !description || !date || !spentBy) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to add a payment.",
        variant: "destructive"
      });
      return;
    }

    if (!canAddTransactionForPerson(spentBy)) {
      toast({
        title: "Permission denied",
        description: "You can only add payments for yourself.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const transaction: Omit<Transaction, 'id'> = {
        amount: parseFloat(amount),
        description,
        date,
        type: 'payment',
        category: 'personal',
        spentBy
      };

      const dbTransactionId = await saveTransactionToDB(transaction);
      onAddTransaction({ ...transaction, id: dbTransactionId } as Transaction);
      
      resetForm();
      toast({
        title: "Payment Added",
        description: `₹${amount} payment for ${description} has been recorded.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    if (!canDeleteTransaction(transaction)) {
      toast({
        title: "Permission denied",
        description: "You can only delete your own transactions.",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteTransactionFromDB(transactionId);
      onDeleteTransaction(transactionId);
      
      toast({
        title: "Transaction Deleted",
        description: "Transaction has been removed successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseInt(a.date);
    const dateB = parseInt(b.date);
    return dateB - dateA;
  });

  const expenseTransactions = sortedTransactions.filter(t => t.type === 'expense');
  const paymentTransactions = sortedTransactions.filter(t => t.type === 'payment');

  const getDaysInMonth = () => {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  const availablePeople = getAvailablePeople();

  return (
    <div className="space-y-6">
      {/* Permission notice for non-owners */}
      {userRole !== 'owner' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> As a card member, you can only add transactions and payments for yourself.
            </p>
          </CardContent>
        </Card>
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
                    {category === 'common' ? 'Spent by (Auto - Split Equally)' : 'Spent by'}
                  </label>
                  <Select 
                    value={spentBy} 
                    onValueChange={setSpentBy}
                    disabled={category === 'common' || (userRole !== 'owner' && availablePeople.length <= 1)}
                  >
                    <SelectTrigger className={category === 'common' ? 'opacity-50 cursor-not-allowed' : ''}>
                      <SelectValue placeholder={
                        category === 'common' 
                          ? "Will be split equally among all people" 
                          : "Who spent this?"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePeople.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} {person.isCardOwner && '(Card Owner)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Select 
                    value={category} 
                    onValueChange={(value: 'personal' | 'common') => {
                      setCategory(value);
                      if (value === 'common') {
                        setSpentBy('');
                      }
                    }}
                    disabled={userRole !== 'owner'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      {userRole === 'owner' && (
                        <SelectItem value="common">Common (Split Equally)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddExpense} className="w-full" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Adding...' : 'Add Expense'}
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
                <Select 
                  value={spentBy} 
                  onValueChange={setSpentBy}
                  disabled={userRole !== 'owner' && availablePeople.length <= 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Who made this payment?" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} {person.isCardOwner && '(Card Owner)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAddPayment} className="w-full" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Adding...' : 'Add Payment'}
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
                      const canDelete = canDeleteTransaction(transaction);
                      
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transaction.description}</span>
                              <Badge 
                                variant={transaction.isCommonSplit ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {transaction.isCommonSplit ? 'Common' : transaction.category}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {person?.name} • {transaction.date} {month} {year}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600">₹{transaction.amount.toFixed(2)}</span>
                            {canDelete && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
                      const canDelete = canDeleteTransaction(transaction);
                      
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
                            {canDelete && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
