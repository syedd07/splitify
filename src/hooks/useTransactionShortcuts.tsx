import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseTransactionShortcutsProps {
  onNewExpense: () => void;
  onNewPayment: () => void;
  onSubmitForm: () => void;
  onFocusAmount: () => void;
  onFocusDescription: () => void;
  isFormVisible: boolean;
}

export const useTransactionShortcuts = ({
  onNewExpense,
  onNewPayment,
  onSubmitForm,
  onFocusAmount,
  onFocusDescription,
  isFormVisible
}: UseTransactionShortcutsProps) => {
  const { toast } = useToast();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only trigger shortcuts when Ctrl/Cmd is pressed
    if (e.ctrlKey || e.metaKey) {
      // Don't trigger if user is typing in certain inputs (except for our custom shortcuts)
      const isInInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      switch (e.key.toLowerCase()) {
        case 'e': // Changed from 'n' to 'e' for Expense
          e.preventDefault();
          onNewExpense();
          toast({
            title: "New Expense",
            description: "Switched to expense tab",
            duration: 1500,
          });
          break;
        case 'r': // Changed from 'p' to 'r' for Record Payment
          e.preventDefault();
          onNewPayment();
          toast({
            title: "New Payment", 
            description: "Switched to payment tab",
            duration: 1500,
          });
          break;
        case 'm': // Changed from 'a' to 'm' for aMount
          e.preventDefault();
          onFocusAmount();
          break;
        case 'q': // Changed from 'd' to 'q' for Text/description
          e.preventDefault();
          onFocusDescription();
          break;
        case 'enter': // Ctrl+Enter to submit
          e.preventDefault();
          onSubmitForm();
          break;
      }
    }

    // Handle Ctrl+Enter separately for form submission
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmitForm();
    }
  }, [onNewExpense, onNewPayment, onSubmitForm, onFocusAmount, onFocusDescription, toast]);

  useEffect(() => {
    if (isFormVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isFormVisible]);
};