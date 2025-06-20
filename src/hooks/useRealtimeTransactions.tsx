import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Person } from '@/types/BillSplitter'; // Add Person import
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeTransactionsProps {
  selectedCard: any;
  selectedMonth: string;
  selectedYear: string;
  user: any;
}

export const  useRealtimeTransactions = ({
  selectedCard,
  selectedMonth,
  selectedYear,
  user
}: UseRealtimeTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  // Add the missing people state
  const [people, setPeople] = useState<Person[]>([]);
  const { toast } = useToast();

  // Load initial transactions
  const loadTransactions = async () => {
    if (!selectedCard || !selectedMonth || !selectedYear || !user) {
      console.log('Missing required data for loading transactions:', {
        selectedCard: !!selectedCard,
        selectedMonth: !!selectedMonth,
        selectedYear: !!selectedYear,
        user: !!user
      });
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
    //  console.log('Loading transactions for card:', selectedCard.id, 'month:', selectedMonth, 'year:', selectedYear);
    //  console.log('Current user:', user.id, user.email);
      
      // Query all transactions for this card - RLS policies will handle access control
      const { data: dbTransactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('credit_card_id', selectedCard.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        toast({
          title: "Error",
          description: "Failed to load transactions",
          variant: "destructive"
        });
        setTransactions([]);
        return;
      }

    //  console.log('Raw DB query result:', dbTransactions);
    //  console.log('Number of transactions loaded from DB:', dbTransactions?.length || 0);

      if (dbTransactions && dbTransactions.length > 0) {
      //  console.log('First transaction details:', dbTransactions[0]);
       // console.log('All transaction spent_by values:', dbTransactions.map(t => t.spent_by_person_name));
      }

      // Convert database transactions to local format
      const localTransactions: Transaction[] = (dbTransactions || []).map(dbTransaction => {
        //console.log('Converting transaction:', dbTransaction.id, 'spent_by:', dbTransaction.spent_by_person_name);

        return {
          id: dbTransaction.id,
          amount: parseFloat(dbTransaction.amount.toString()),
          description: dbTransaction.description,
          date: dbTransaction.transaction_date.split('-')[2], // Extract day from YYYY-MM-DD
          type: dbTransaction.transaction_type as 'expense' | 'payment',
          category: dbTransaction.category as 'personal' | 'common',
          spentBy: dbTransaction.spent_by_person_name,
          isCommonSplit: dbTransaction.is_common_split || false
        };
      });

     // console.log('Converted local transactions:', localTransactions);
     // console.log('Local transactions count:', localTransactions.length);
      
      setTransactions(localTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive"
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!selectedCard || !user) {
      console.log('Cannot set up real-time subscription - missing data:', {
        selectedCard: !!selectedCard,
        user: !!user
      });
      setLoading(false);
      return;
    }

    console.log('Setting up real-time subscription for card:', selectedCard.id);

    // Load initial data
    loadTransactions();

    // Set up real-time subscription for this specific card
    const channel = supabase
      .channel(`transactions-${selectedCard.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `credit_card_id=eq.${selectedCard.id}`
        },
        (payload) => {
        //  console.log('Real-time INSERT received:', payload);
          const newTransaction = payload.new;
          
          // Only add if it matches current month/year
          if (newTransaction.month === selectedMonth && newTransaction.year === selectedYear) {
            const localTransaction: Transaction = {
              id: newTransaction.id,
              amount: parseFloat(newTransaction.amount.toString()),
              description: newTransaction.description,
              date: newTransaction.transaction_date.split('-')[2],
              type: newTransaction.transaction_type as 'expense' | 'payment',
              category: newTransaction.category as 'personal' | 'common',
              spentBy: newTransaction.spent_by_person_name,
              isCommonSplit: newTransaction.is_common_split || false
            };

            setTransactions(prev => {
              // Check if transaction already exists to avoid duplicates
              if (prev.some(t => t.id === localTransaction.id)) {
               // console.log('Transaction already exists, skipping duplicate');
                return prev;
              }
              // console.log('Adding new transaction to state:', localTransaction);
              return [localTransaction, ...prev];
            });

            // Show toast notification for all users when someone adds a transaction
            toast({
              title: "New Transaction Added",
              description: `${newTransaction.description} - ₹${newTransaction.amount}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions',
          filter: `credit_card_id=eq.${selectedCard.id}`
        },
        (payload) => {
        //  console.log('Real-time DELETE received:', payload);
          const deletedTransaction = payload.old;
          
          setTransactions(prev => prev.filter(t => t.id !== deletedTransaction.id));

          // Show toast notification for deletion
          toast({
            title: "Transaction Deleted",
            description: `${deletedTransaction.description} was removed`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `credit_card_id=eq.${selectedCard.id}`
        },
        (payload) => {
         // console.log('Real-time UPDATE received:', payload);
          const updatedTransaction = payload.new;
          
          // Only update if it matches current month/year
          if (updatedTransaction.month === selectedMonth && updatedTransaction.year === selectedYear) {
            const localTransaction: Transaction = {
              id: updatedTransaction.id,
              amount: parseFloat(updatedTransaction.amount.toString()),
              description: updatedTransaction.description,
              date: updatedTransaction.transaction_date.split('-')[2],
              type: updatedTransaction.transaction_type as 'expense' | 'payment',
              category: updatedTransaction.category as 'personal' | 'common',
              spentBy: updatedTransaction.spent_by_person_name,
              isCommonSplit: updatedTransaction.is_common_split || false
            };

            setTransactions(prev => prev.map(t => t.id === localTransaction.id ? localTransaction : t));

            // Show toast notification for update
            toast({
              title: "Transaction Updated",
              description: `${updatedTransaction.description} was modified`,
            });
          }
        }
      )
      .subscribe((status) => {
       // console.log('Real-time subscription status:', status);
      });

    return () => {
      // console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedCard?.id, selectedMonth, selectedYear, user?.id]);

  // Reload when month/year changes
  useEffect(() => {
    if (selectedCard && user) {
      // console.log('Month/Year changed, reloading transactions...');
      loadTransactions();
    }
  }, [selectedMonth, selectedYear]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      console.log('Adding transaction:', transaction);

      // Convert month name to number
      const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'].indexOf(selectedMonth) + 1;
      
      // Format date properly
      const formattedDate = `${selectedYear}-${String(monthIndex).padStart(2, '0')}-${String(transaction.date).padStart(2, '0')}`;
      
      // Create transaction object with precise type conversions
      const dbTransaction = {
        user_id: user?.id,
        credit_card_id: selectedCard?.id,
        amount: Number(transaction.amount), // Use Number constructor for numeric type
        description: String(transaction.description || ""), 
        transaction_date: formattedDate,
        transaction_type: String(transaction.type || "expense"),
        category: String(transaction.category || "personal"),
        spent_by_person_name: String(transaction.spentBy || ""),
        month: String(selectedMonth),
        year: String(selectedYear),
        is_common_split: Boolean(transaction.isCommonSplit) // Use Boolean constructor
      };

      console.log('Inserting transaction to DB:', dbTransaction);

      // CHANGE: Split the operation into insert and select
      // First, insert without returning data
      const insertResult = await supabase
        .from('transactions')
        .insert([dbTransaction]);

      if (insertResult.error) {
        console.error('Error inserting transaction:', insertResult.error);
        toast({
          title: "Error",
          description: `Failed to add transaction: ${insertResult.error.message}`,
          variant: "destructive"
        });
        throw insertResult.error;
      }

      // Then get the ID with a separate query
      const { data: insertedData, error: fetchError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('credit_card_id', selectedCard.id)
        .eq('description', transaction.description)
        .eq('transaction_date', formattedDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Error fetching inserted transaction ID:', fetchError);
        // Return a temporary client-side ID as fallback
        const tempId = crypto.randomUUID();
        console.log('Using temporary ID:', tempId);
        return tempId;
      }

      console.log('Transaction inserted successfully:', insertedData);
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    
      return insertedData.id;
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      // console.log('Deleting transaction:', transactionId);
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }

      // console.log('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  // When fetching people data from profiles table
  const fetchPeopleForCard = async (cardId: string) => {
    try {
      // Get card members
      // @ts-ignore - Skip type checking for this complex query
      const result = await supabase
        .from('card_members')
        .select('user_id')
        .eq('card_id', cardId);
      
      if (result.error) throw result.error;
      
      const memberIds = (result.data || []).map((member: any) => member.user_id);
      
      // Include the card owner in people
      if (selectedCard && !memberIds.includes(selectedCard.user_id)) {
        memberIds.push(selectedCard.user_id);
      }
      
      // Get profiles with full_name field
      // @ts-ignore - Skip type checking
      const profilesResult = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', memberIds);
      
      if (profilesResult.error) throw profilesResult.error;
      const profiles = profilesResult.data;
      
      // Create Person objects with proper name handling
      const newPeople: Person[] = profiles.map(profile => ({
        id: profile.id,
        // Use full_name if available, otherwise use email as fallback
        name: profile.full_name || profile.email,
        isCardOwner: profile.id === selectedCard?.user_id
      }));
      
      setPeople(newPeople);
      return newPeople;
    } catch (error) {
      console.error('Error fetching people for card:', error);
      toast({
        title: "Error",
        description: "Failed to load people for this card.",
        variant: "destructive",
      });
      return [];
    }
  };

  return {
    transactions,
    loading,
    people, // Add people to the returned values
    fetchPeopleForCard, // Add the function to the returned values
    addTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions
  };
};
