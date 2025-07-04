import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/BillSplitter";
import { useToast } from "@/hooks/use-toast";

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
  user,
}: UseRealtimeTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
 // const [batchQueue, setBatchQueue] = useState<any[]>([]);
//  const [batchTimeout, setBatchTimeout] = useState<NodeJS.Timeout | null>(null);
 // const [isBatching, setIsBatching] = useState(false);
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);

  // Extract stable values
  const cardId = selectedCard?.id;
  const userId = user?.id;

  // Function to trigger notifications for card members
  const triggerNotifications = async (payload: any) => {
    // Make notifications non-blocking by not awaiting the result
    setTimeout(async () => {
      try {
        // Only trigger notifications for INSERT events (disable DELETE)
        if (payload.eventType !== "INSERT") {
          return;
        }

        // Get the transaction data
        const transactionData = payload.new;

        // Don't notify the user who made the change
        if (transactionData.user_id === userId) {
          return;
        }

        // Call our Edge Function to send notifications (non-blocking)
        const session = await supabase.auth.getSession();
        
        if (!session.data.session?.access_token) {
          console.log("No session available for notifications");
          return;
        }

        fetch("https://cgdhvzgmndgscqiradnr.supabase.co/functions/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            event_type: payload.eventType.toLowerCase(),
            transaction_id: transactionData.id,
            user_id: transactionData.user_id,
            credit_card_id: transactionData.credit_card_id,
            amount: transactionData.amount,
            description: transactionData.description,
            transaction_type: transactionData.transaction_type,
            spent_by_person_name: transactionData.spent_by_person_name,
            created_at: transactionData.created_at,
          }),
        }).catch(error => {
          console.error("Background notification failed:", error);
        });

      } catch (error) {
        console.error("Error in background notification:", error);
      }
    }, 0); // Fire immediately but don't block
  };

  // New function to show real-time toast notifications
  const showRealtimeToast = (payload: any) => {
    // Only show toast for INSERT events (new transactions)
    if (payload.eventType !== "INSERT") {
      return;
    }

    const transactionData = payload.new;

    // Don't show toast for current user's transactions
    if (transactionData.user_id === userId) {
      return;
    }

    // Check if user is on transactions page
    const isOnTransactionsPage = window.location.pathname.includes('/transactions');
    
    if (isOnTransactionsPage) {
      const isExpense = transactionData.transaction_type === 'expense';
      const amount = parseFloat(transactionData.amount);
      const spentBy = transactionData.spent_by_person_name;
      const description = transactionData.description;

      toast({
        title: isExpense ? "💸 New Expense" : "💰 New Payment",
        description: `${spentBy} added ₹${amount} for ${description}`,
        className: isExpense 
          ? "border-blue-200 bg-blue-50 text-blue-900" 
          : "border-green-200 bg-green-50 text-green-900",
        duration: 4000,
      });
    }
  };

  // Add this after showRealtimeToast function:

  // Simple loading function - NO useCallback to avoid circular dependencies
  const loadTransactions = async () => {
    if (!cardId || !selectedMonth || !selectedYear || !userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: dbTransactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("credit_card_id", cardId)
        .eq("month", selectedMonth)
        .eq("year", selectedYear)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading transactions:", error);
        toast({
          title: "Error",
          description: "Failed to load transactions",
          variant: "destructive",
        });
        setTransactions([]);
        return;
      }

      // Convert database transactions to local format
      type DbTransaction = {
        id: string;
        amount: number;
        description: string;
        transaction_date: string;
        transaction_type: string;
        category: string;
        spent_by_person_name: string;
        is_common_split: boolean;
        included_people?: string[];
        // other fields...
      };

      const localTransactions: Transaction[] = (dbTransactions || []).map(
        (dbTransaction: DbTransaction) => ({
          id: dbTransaction.id,
          amount: parseFloat(dbTransaction.amount.toString()),
          description: dbTransaction.description,
          date: dbTransaction.transaction_date.split("-")[2], // Extract day from YYYY-MM-DD
          type: dbTransaction.transaction_type as "expense" | "payment",
          category: dbTransaction.category as "personal" | "common",
          spentBy: dbTransaction.spent_by_person_name,
          isCommonSplit: dbTransaction.is_common_split || false,
          includedPeople: dbTransaction.included_people ?? undefined,
        })
      );

      setTransactions(localTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect for initial load and real-time subscription
  useEffect(() => {
    let isMounted = true;

    const setupTransactions = async () => {
      if (!cardId || !userId) {
        return;
      }

      // Load initial data
      await loadTransactions();

      // Clean up existing subscription
      if (subscriptionRef.current) {
        await subscriptionRef.current.unsubscribe();
      }

      // Set up new subscription
      subscriptionRef.current = supabase
        .channel(`transactions-${cardId}-${selectedMonth}-${selectedYear}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `credit_card_id=eq.${cardId}`,
          },
          async (payload) => {
            // console.log("Real-time transaction update:", payload);
            if (isMounted) {
              // Trigger notifications for INSERT/DELETE events
              await triggerNotifications(payload);

              // Show real-time toast for new transactions
              showRealtimeToast(payload);

              // Reload transactions when changes occur
              loadTransactions();
            }
          }
        )
        .subscribe();
    };

    setupTransactions();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [cardId, selectedMonth, selectedYear, userId]); // Removed loadTransactions from dependencies

  // NO useCallback to avoid circular dependencies
  const addTransaction = async (transaction: Omit<Transaction, "id"> & { includedPeople?: string[] }) => {
    try {
      // Convert month name to number
      const monthIndex =
        [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ].indexOf(selectedMonth) + 1;

      // Format date properly
      const formattedDate = `${selectedYear}-${String(monthIndex).padStart(2, "0")}-${String(transaction.date).padStart(2, "0")}`;

      const dbTransaction: any = {
        user_id: userId,
        credit_card_id: cardId,
        amount: Number(transaction.amount),
        description: String(transaction.description || ""),
        transaction_date: formattedDate,
        transaction_type: String(transaction.type || "expense"),
        category: String(transaction.category || "personal"),
        spent_by_person_name: String(transaction.spentBy || ""),
        month: String(selectedMonth),
        year: String(selectedYear),
        is_common_split: Boolean(transaction.isCommonSplit),
      };

      // Add included_people only for common split
      if (transaction.isCommonSplit && Array.isArray(transaction.includedPeople)) {
        dbTransaction.included_people = transaction.includedPeople;
      }

      // SIMPLIFIED APPROACH: Process immediately for now
      // We can add batching back later once single transactions work properly
    
      const { data, error } = await supabase
        .from("transactions")
        .insert([dbTransaction])
        .select("id")
        .single();

      if (error) {
        console.error("Error inserting transaction:", error);
        toast({
          title: "Error",
          description: `Failed to add transaction: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "✅ Transaction Added",
        description: `₹${transaction.amount} for ${transaction.description}`,
        className: transaction.type === 'expense' 
          ? "border-blue-200 bg-blue-50" 
          : "border-green-200 bg-green-50",
      });

      return data.id;

    } catch (error) {
      console.error("Error saving transaction:", error);
      
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // NO useCallback to avoid circular dependencies
  const deleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) {
        console.error("Error deleting transaction:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  

  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions,
    // Add these new properties for batch status
    // isBatching,
    // batchQueueLength: batchQueue.length,
  };
};
