import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Receipt, Banknote, Calendar, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person } from '@/types/BillSplitter';
import { Checkbox } from '@/components/ui/checkbox'; // Add this import if Checkbox exists

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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [commonSplitPeople, setCommonSplitPeople] = useState<string[]>(people.map(p => p.id));

  // Helper function to get person name - now that spentBy stores names directly
  const getPersonDisplayName = (spentByValue: string) => {
   // console.log('🔍 Getting display name for:', spentByValue);
    
    // If spentBy is already a name (from database), return it directly
    if (spentByValue && !spentByValue.includes('-') && !spentByValue.startsWith('guest_') && spentByValue.length < 50) {
    //  console.log('✅ Using stored name:', spentByValue);
      return spentByValue;
    }
    
    // Handle guest IDs (starts with 'guest_')
    if (spentByValue && spentByValue.startsWith('guest_')) {
      // Try to find guest in people array by ID
      const guestPerson = people.find(p => p.id === spentByValue);
      if (guestPerson) {
       // console.log('✅ Found guest person by ID:', guestPerson.name);
        return guestPerson.name;
      }
      // console.log('⚠️ Guest not found in people array, using fallback');
      return 'Guest User';
    }
    
    // Fallback: try to find person by ID (for backward compatibility)
    const person = people.find(p => 
      p.id === spentByValue || 
      ('user_id' in p && p.user_id === spentByValue)
    );
    
    if (person) {
     // console.log('✅ Found person by ID lookup:', person.name);
      return person.name;
    }
    
    // Special case: Check if spentByValue matches currentUser.id
    if (currentUser && spentByValue === currentUser.id) {
      // This transaction was made by the current user
      if (userProfile?.full_name) {
       // console.log('✅ Using current user full_name:', userProfile.full_name);
        return userProfile.full_name;
      }
      if (userProfile?.email) {
       // console.log('✅ Using current user email:', userProfile.email);
        return userProfile.email;
      }
    }

    // console.log('⚠️ Could not resolve name, using fallback');
    return 'Unknown User';
  };

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

  // Update commonSplitPeople when people list changes
  useEffect(() => {
    setCommonSplitPeople(people.map(p => p.id));
  }, [people]);

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
    try {
      setLoading(true);
      setConnectionStatus('reconnecting');

      // Validation
      if (!amount || !description || !date || (category !== 'common' && !spentBy)) {
        setLoading(false); // ADD THIS LINE
        setConnectionStatus('connected'); // ADD THIS LINE
        toast({
          title: "Missing Information",
          description: "Please fill in all fields",
          variant: "destructive"
        });
        return;
      }
      if (category === 'common' && commonSplitPeople.length < 2) {
        setLoading(false); // ADD THIS LINE
        setConnectionStatus('connected'); // ADD THIS LINE
        toast({
          title: "Select People",
          description: "Select at least 2 people for a common split.",
          variant: "destructive"
        });
        return;
      }

      let spentByValue = spentBy;
      if (category === 'common') {
        spentByValue = 'common';
      }

      let selectedPerson = null;
      if (category !== 'common') {
        selectedPerson = people.find(p => p.id === spentBy);
        if (!selectedPerson) {
          toast({
            title: "Error",
            description: "Selected person not found",
            variant: "destructive"
          });
          return;
        }
      }

      const transaction: Omit<Transaction, 'id'> & { includedPeople?: string[] } = {
        amount: parseFloat(amount),
        description,
        date,
        type: 'expense',
        category,
        spentBy: category === 'common' ? 'common' : selectedPerson!.name,
        isCommonSplit: category === 'common',
        month,
        year,
        user_id: currentUser?.id,
        credit_card_id: selectedCard?.id,
        ...(category === 'common' ? { includedPeople: commonSplitPeople } : {})
      };

      // Call addTransaction with proper error handling
      const result = await addTransaction(transaction);
      
      if (result) {
        // Success - reset form and update status
        setConnectionStatus('connected');
        setLastSyncTime(new Date());
        resetForm();

        // Focus on amount input for next transaction
        setTimeout(() => {
          const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
          amountInput?.focus();
        }, 100);
      }

    } catch (error) {
      // Error handling
      setConnectionStatus('disconnected');
      console.error('Failed to add expense:', error);
      
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      // ALWAYS reset loading state - this is crucial
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
      // Find the person to get their name
      const selectedPerson = people.find(p => p.id === spentBy);
      if (!selectedPerson) {
        toast({
          title: "Error",
          description: "Selected person not found",
          variant: "destructive"
        });
        return;
      }

      const transaction: Omit<Transaction, 'id'> = {
        amount: parseFloat(amount),
        description,
        date,
        type: 'payment',
        category: 'personal',
        spentBy: selectedPerson.name, // Store person's name, not ID
        month,
        year,
        user_id: currentUser?.id,
        credit_card_id: selectedCard?.id
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
    
    // Fix: Compare transaction.spentBy (name) with currentUserPerson.name (name)
    if (!isCardOwner && currentUserPerson && transaction && transaction.spentBy !== currentUserPerson.name) {
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

  // Add connection status indicator in your component
  const ConnectionStatusBadge = () => (
    <div className="flex items-center gap-2 text-xs">
      {connectionStatus === 'connected' && (
        <>
          <Wifi className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Live</span>
        </>
      )}
      {connectionStatus === 'disconnected' && (
        <>
          <WifiOff className="w-3 h-3 text-red-500" />
          <span className="text-red-600">Offline</span>
        </>
      )}
      {connectionStatus === 'reconnecting' && (
        <>
          <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
          <span className="text-yellow-600">Syncing...</span>
        </>
      )}
      <span className="text-muted-foreground">
        Last sync: {lastSyncTime.toLocaleTimeString()}
      </span>
    </div>
  );

  interface BatchStatusBadgeProps {
    isBatching: boolean;
    batchQueueLength: number;
  }

  const BatchStatusBadge: React.FC<BatchStatusBadgeProps> = ({ isBatching, batchQueueLength }) => {
    if (!isBatching && batchQueueLength === 0) return null;

    return (
      <div className="flex items-center gap-2 text-xs">
        {isBatching && (
          <>
            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
            <span className="text-blue-600">Processing batch...</span>
          </>
        )}
        {batchQueueLength > 0 && !isBatching && (
          <>
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-600">
              {batchQueueLength} transaction{batchQueueLength > 1 ? 's' : ''} queued
            </span>
          </>
        )}
      </div>
    );
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
          <Card className="border border-blue-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                <Receipt className="w-5 h-5 text-blue-600" />
                Record Expense
                <Badge variant="outline" className="ml-auto text-xs">
                  {category === 'common' ? 'Split Equally' : 'Personal'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Amount and Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Select value={date} onValueChange={setDate}>
                    <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {getDaysInMonth().map((day) => (
                        <SelectItem key={day} value={day} className="hover:bg-blue-50">
                          {day} {month} {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="What was this expense for? (e.g., Dinner at restaurant, Groceries)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Spent By and Category Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {category === 'common' ? 'Spent by (Auto - Split Equally)' : 'Spent by'}
                    {category !== 'common' && <span className="text-red-500"> *</span>}
                  </label>
                  <Select 
                    value={spentBy} 
                    onValueChange={setSpentBy}
                    disabled={category === 'common' || isCardMember}
                  >
                    <SelectTrigger className={`h-11 ${category === 'common' || isCardMember ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'border-gray-300 focus:border-blue-500'}`}>
                      <SelectValue placeholder={
                        category === 'common' 
                          ? "Will be split equally among selected people" 
                          : isCardMember 
                          ? "You (Card Member)"
                          : "Select who spent this"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePeople().map((person) => (
                        <SelectItem key={person.id} value={person.id} className="hover:bg-blue-50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {person.name} {person.isCardOwner && <Badge variant="outline" className="text-xs">Owner</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
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
                    <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal" className="hover:bg-blue-50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Personal Expense
                        </div>
                      </SelectItem>
                      {!isCardMember && (
                        <SelectItem value="common" className="hover:bg-blue-50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Common (Split Equally)
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Common Split People Selection */}
              {category === 'common' && (
                <div className="p-4 border-2 border-dashed border-purple-200 rounded-lg bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
                  <label className="block text-sm font-semibold mb-3 text-purple-900 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Include in Split
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {people.map(person => (
                      <label key={person.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 cursor-pointer transition-colors">
                        {typeof Checkbox !== "undefined" ? (
                          <Checkbox
                            checked={commonSplitPeople.includes(person.id)}
                            onCheckedChange={checked => {
                              if (checked) {
                                setCommonSplitPeople(prev => [...prev, person.id]);
                              } else {
                                setCommonSplitPeople(prev => prev.filter(id => id !== person.id));
                              }
                            }}
                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={commonSplitPeople.includes(person.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setCommonSplitPeople(prev => [...prev, person.id]);
                              } else {
                                setCommonSplitPeople(prev => prev.filter(id => id !== person.id));
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                        )}
                        <span className="text-sm font-medium flex items-center gap-2">
                          {person.name} 
                          {person.isCardOwner && (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                              Owner
                            </Badge>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {commonSplitPeople.length < 2 && (
                    <div className="flex items-center gap-2 text-xs text-red-600 mt-3 p-2 bg-red-50 rounded-md">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      Select at least 2 people for a common split expense.
                    </div>
                  )}
                  {commonSplitPeople.length >= 2 && (
                    <div className="flex items-center gap-2 text-xs text-green-600 mt-3 p-2 bg-green-50 rounded-md">
                      <CheckCircle className="w-3 h-3" />
                      Amount will be split equally among {commonSplitPeople.length} people (₹{amount ? (parseFloat(amount) / commonSplitPeople.length).toFixed(2) : '0.00'} each)
                    </div>
                  )}
                </div>
              )}

              {/* Add Expense Button */}
              <Button 
                onClick={handleAddExpense} 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Adding Expense...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Add Expense {amount && `(₹${amount})`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card className="border border-green-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="text-lg flex items-center gap-2 text-green-900">
                <Banknote className="w-5 h-5 text-green-600" />
                Record Payment
                <Badge variant="outline" className="ml-auto text-xs border-green-600 text-green-600">
                  Credit Settlement
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Amount and Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 h-11 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <Select value={date} onValueChange={setDate}>
                    <SelectTrigger className="h-11 border-gray-300 focus:border-green-500">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {getDaysInMonth().map((day) => (
                        <SelectItem key={day} value={day} className="hover:bg-green-50">
                          {day} {month} {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Payment Description <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Payment method (e.g., Credit card payment, UPI transfer, Bank transfer)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>

              {/* Paid By Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Paid by <span className="text-red-500">*</span>
                </label>
                <Select value={spentBy} onValueChange={setSpentBy} disabled={isCardMember}>
                  <SelectTrigger className={`h-11 ${isCardMember ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'border-gray-300 focus:border-green-500'}`}>
                    <SelectValue placeholder={isCardMember ? "You (Card Member)" : "Select who made this payment"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePeople().map((person) => (
                      <SelectItem key={person.id} value={person.id} className="hover:bg-green-50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {person.name} {person.isCardOwner && <Badge variant="outline" className="text-xs">Owner</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Info Box */}
              <div className="p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Payment reduces the selected person's outstanding balance</span>
                </div>
              </div>

              {/* Add Payment Button */}
              <Button 
                onClick={handleAddPayment} 
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Record Payment {amount && `(₹${amount})`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Status and Batch Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
        <ConnectionStatusBadge />
        <BatchStatusBadge isBatching={false} batchQueueLength={0} />
      </div>

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
                      const personName = getPersonDisplayName(transaction.spentBy);
                      const isCardOwner = selectedCard && currentUser && selectedCard.user_id === currentUser.id;
                      // Fix: Compare transaction.spentBy (name) with currentUserPerson.name (name)
                      const canDelete = isCardOwner || (currentUserPerson && transaction.spentBy === currentUserPerson.name);
                      
                    //  console.log('Rendering expense transaction:', transaction.id, 'spentBy:', transaction.spentBy, 'personName:', personName);
                      
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
                              {personName} • {transaction.date} {month} {year}
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
                      const personName = getPersonDisplayName(transaction.spentBy);
                      const isCardOwner = selectedCard && currentUser && selectedCard.user_id === currentUser.id;
                      // Fix: Compare transaction.spentBy (name) with currentUserPerson.name (name)
                      const canDelete = isCardOwner || (currentUserPerson && transaction.spentBy === currentUserPerson.name);
                      
                     // console.log('Rendering payment transaction:', transaction.id, 'spentBy:', transaction.spentBy, 'personName:', personName);
                      
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
                              {personName} • {transaction.date} {month} {year}
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
