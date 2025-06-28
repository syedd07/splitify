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
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);

  // Extract stable values
  const cardId = selectedCard?.id;
  const userId = user?.id;

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
      const localTransactions: Transaction[] = (dbTransactions || []).map(
        (dbTransaction) => ({
          id: dbTransaction.id,
          amount: parseFloat(dbTransaction.amount.toString()),
          description: dbTransaction.description,
          date: dbTransaction.transaction_date.split("-")[2], // Extract day from YYYY-MM-DD
          type: dbTransaction.transaction_type as "expense" | "payment",
          category: dbTransaction.category as "personal" | "common",
          spentBy: dbTransaction.spent_by_person_name,
          isCommonSplit: dbTransaction.is_common_split || false,
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
          (payload) => {
            console.log("Real-time transaction update:", payload);
            if (isMounted) {
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
  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    try {
      console.log("Adding transaction:", transaction);

      // Convert month name to number
      const monthIndex =
        [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ].indexOf(selectedMonth) + 1;

      // Format date properly
      const formattedDate = `${selectedYear}-${String(monthIndex).padStart(
        2,
        "0"
      )}-${String(transaction.date).padStart(2, "0")}`;

      const dbTransaction = {
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
        title: "Success",
        description: "Transaction added successfully",
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
  };
};
