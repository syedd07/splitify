
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';

interface UseExpenseFormProps {
  people: Person[];
  selectedCard?: CreditCard | null;
  onAddTransaction: (transaction: Transaction) => void;
  month: string;
  year: string;
}

export const useExpenseForm = ({
  people,
  selectedCard,
  onAddTransaction,
  month,
  year
}: UseExpenseFormProps) => {
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

  const getDaysInMonth = () => {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  const validateForm = () => {
    if (!amount || !description || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return false;
    }

    if (category === 'personal' && !spentBy) {
      toast({
        title: "Missing Information",
        description: "Please select who spent this amount.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  return {
    amount,
    setAmount,
    description,
    setDescription,
    date,
    setDate,
    spentBy,
    setSpentBy,
    category,
    setCategory,
    resetForm,
    getDaysInMonth,
    validateForm,
    toast,
    selectedCard,
    onAddTransaction
  };
};
