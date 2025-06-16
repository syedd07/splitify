
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

interface TransactionEntryProps {
  people: Person[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  transactions: Transaction[];
  month: string;
  year: string;
  selectedCard: any;
  currentUser: any;
  userProfile: any;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<string>;
  deleteTransaction: (transactionId: string) => Promise<void>;
}

const TransactionEntry: React.FC<TransactionEntryProps> = ({
  people,
  transactions,
  month,
  year,
  selectedCard,
  currentUser,
  userProfile,
  addTransaction,
  deleteTransaction
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [spentBy, setSpentBy] = useState('');
  const [category, setCategory] = useState<'personal' | 'common'>('personal');
  const [loading, setLoading] = useState(false);
  const [isCardMember, setIsCardMember] = useState(false);
  const [currentUserPerson, setCurrentUserPerson] = useState<Person | null>(null);

  // Check if current user is card member and set default spentBy
  useEffect(() => {
    if (selectedCard && currentUser && userProfile) {
      const isOwner = selectedCard.user_id === currentUser.id;
      setIsCardMember(!isOwner);

      // Find current user's person object
      const userPerson = people.find(person => 
        person.name === userProfile.full_name || 
        person.name === userProfile.email ||
        person.id === userProfile.id
      );
      
      setCurrentUserPerson(userPerson || null);

      // For card members, automatically set spentBy to themselves
      if (!isOwner && userPerson) {
        setSpentBy(userPerson.id);
      }
    }
  }, [selectedCard, currentUser, userProfile, people]);

  // Pre-select current date
  useEffect(() => {
    const currentDate = new Date();
    const currentDay = currentDate.getDate().toString();
    setDate(currentDay);
  }, []);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    // Keep current date selected
    const currentDate = new Date();
    const currentDay = currentDate.getDate().toString();
    setDate(currentDay);
    
    // For card members, keep spentBy set to themselves
    if (isCardMember && currentUserPerson) {
      setSpentBy(currentUserPerson.id);
    } else if (!isCardMember) {
      setSpentBy('');
    }
    setCategory('personal');
  };

  const handleAddExpense = async () => {
    // Quick validation checks first
    if (isCardMember && currentUserPerson && spentBy !== currentUserPerson.id) {
      toast({
        title: "Access Restricted",
        description: "As a card member, you can only record your own expenses.",
        variant: "destructive"
      });
      return;
    }

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

    if (isCardMember && category === 'common') {
      toast({
        title: "Access Restricted",
        description: "As a card member, you can only record personal expenses.",
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

      // Save to database - real-time sync will handle UI updates
      await addTransaction(transaction);
      
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
    // Quick validation checks first
    if (isCardMember && currentUserPerson && spentBy !== currentUserPerson.id) {
      toast({
        title: "Access Restricted",
        description: "As a card member, you can only record your own payments.",
        variant: "destructive"
      });
      return;
    }

    if (!amount || !description || !date || !spentBy) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to add a payment.",
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

      // Save to database - real-time sync will handle UI updates
      await addTransaction(transaction);
      
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
    
    // Card members can only delete their own transactions
    // Card owners can delete any transaction
    const isCardOwner = selectedCard && currentUser && selectedCard.user_id === currentUser.id;
    
    if (!isCardOwner && currentUserPerson && transaction && transaction.spentBy !== currentUserPerson.id) {
      toast({
        title: "Access Restricted",
        description: "You can only delete your own transactions.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Delete from database - real-time sync will handle UI updates
      await deleteTransaction(transactionId);
      
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

  // Sort transactions by date in descending order (latest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseInt(a.date);
    const dateB = parseInt(b.date);
    return dateB - dateA;
  });

  const expenseTransactions = sortedTransactions.filter(t => t.type === 'expense');
  const paymentTransactions = sortedTransactions.filter(t => t.type === 'payment');

  // Get days in month for date selection - memoized for performance
  const getDaysInMonth = () => {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  // Filter people for dropdowns based on user role
  const getAvailablePeople = () => {
    if (isCardMember && currentUserPerson) {
      return [currentUserPerson];
    }
    return people;
  };

  return (
    <div className="space-y-6">
      {isCardMember && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> As a card member, you can only record your own expenses and payments. You cannot create common expenses or record transactions for others.
          </p>
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
                    {category === 'common' ? 'Spent by (Auto - Split Equally)' : 'Spent by'}
                  </label>
                  <Select 
                    value={spentBy} 
                    onValueChange={setSpentBy}
                    disabled={category === 'common' || isCardMember}
                  >
                    <SelectTrigger className={category === 'common' || isCardMember ? 'opacity-50 cursor-not-allowed' : ''}>
                      <SelectValue placeholder={
                        category === 'common' 
                          ? "Will be split equally among all people" 
                          : isCardMember 
                          ? "You (Card Member)"
                          : "Who spent this?"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePeople().map((person) => (
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
                    if (isCardMember && value === 'common') {
                      toast({
                        title: "Access Restricted",
                        description: "Card members can only record personal expenses.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    setCategory(value);
                    if (value === 'common') {
                      setSpentBy('');
                    } else if (isCardMember && currentUserPerson) {
                      setSpentBy(currentUserPerson.id);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      {!isCardMember && (
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
                <Select value={spentBy} onValueChange={setSpentBy} disabled={isCardMember}>
                  <SelectTrigger className={isCardMember ? 'opacity-50 cursor-not-allowed' : ''}>
                    <SelectValue placeholder={isCardMember ? "You (Card Member)" : "Who made this payment?"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePeople().map((person) => (
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
              Transaction History - All Card Transactions
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Live</span>
              </div>
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
                      const isCardOwner = selectedCard && currentUser && selectedCard.user_id === currentUser.id;
                      const canDelete = isCardOwner || (currentUserPerson && transaction.spentBy === currentUserPerson.id);
                      
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
                              {person?.name || transaction.spentBy} • {transaction.date} {month} {year}
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
                      const isCardOwner = selectedCard && currentUser && selectedCard.user_id === currentUser.id;
                      const canDelete = isCardOwner || (currentUserPerson && transaction.spentBy === currentUserPerson.id);
                      
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
                              {person?.name || transaction.spentBy} • {transaction.date} {month} {year}
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
