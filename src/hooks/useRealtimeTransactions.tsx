
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/BillSplitter';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeTransactionsProps {
  selectedCard: any;
  selectedMonth: string;
  selectedYear: string;
  user: any;
}

export const useRealtimeTransactions = ({
  selectedCard,
  selectedMonth,
  selectedYear,
  user
}: UseRealtimeTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load initial transactions
  const loadTransactions = async () => {
    if (!selectedCard || !selectedMonth || !selectedYear || !user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading transactions for card:', selectedCard.id, 'month:', selectedMonth, 'year:', selectedYear);
      
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

      console.log('Loaded transactions:', dbTransactions);

      // Convert database transactions to local format
      const localTransactions: Transaction[] = (dbTransactions || []).map(dbTransaction => ({
        id: dbTransaction.id,
        amount: parseFloat(dbTransaction.amount.toString()),
        description: dbTransaction.description,
        date: dbTransaction.transaction_date.split('-')[2], // Extract day from YYYY-MM-DD
        type: dbTransaction.transaction_type as 'expense' | 'payment',
        category: dbTransaction.category as 'personal' | 'common',
        spentBy: dbTransaction.spent_by_person_name,
        isCommonSplit: dbTransaction.is_common_split || false
      }));

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
          console.log('Real-time INSERT received:', payload);
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
                console.log('Transaction already exists, skipping duplicate');
                return prev;
              }
              console.log('Adding new transaction to state:', localTransaction);
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
          console.log('Real-time DELETE received:', payload);
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
          console.log('Real-time UPDATE received:', payload);
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
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedCard?.id, selectedMonth, selectedYear, user?.id]);

  // Reload when month/year changes
  useEffect(() => {
    if (selectedCard && user) {
      loadTransactions();
    }
  }, [selectedMonth, selectedYear]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      console.log('Adding transaction:', transaction);
      
      const dbTransaction = {
        user_id: user.id,
        credit_card_id: selectedCard.id,
        amount: transaction.amount,
        description: transaction.description,
        transaction_date: `${selectedYear}-${String(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(selectedMonth) + 1).padStart(2, '0')}-${String(transaction.date).padStart(2, '0')}`,
        transaction_type: transaction.type,
        category: transaction.category,
        spent_by_person_name: transaction.spentBy,
        month: selectedMonth,
        year: selectedYear,
        is_common_split: transaction.isCommonSplit || false
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(dbTransaction)
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting transaction:', error);
        throw error;
      }
      
      console.log('Transaction inserted successfully:', data);
      return data.id;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      console.log('Deleting transaction:', transactionId);
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }
      
      console.log('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions
  };
};
