
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';
import { useExpenseForm } from './hooks/useExpenseForm';
import { createCommonExpense } from './utils/commonExpenseHandler';
import ExpenseFormFields from './components/ExpenseFormFields';

interface ExpenseFormProps {
  people: Person[];
  selectedCard?: CreditCard | null;
  onAddTransaction: (transaction: Transaction) => void;
  month: string;
  year: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  people,
  selectedCard,
  onAddTransaction,
  month,
  year
}) => {
  const {
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
    toast
  } = useExpenseForm({
    people,
    selectedCard,
    onAddTransaction,
    month,
    year
  });

  const handleAddExpense = () => {
    if (!validateForm()) {
      return;
    }

    if (category === 'common') {
      createCommonExpense({
        amount,
        description,
        date,
        people,
        selectedCard,
        onAddTransaction,
        toast
      });
    } else {
      const transaction: Transaction = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        date,
        type: 'expense',
        category,
        spentBy,
        creditCardId: selectedCard?.id
      };

      onAddTransaction(transaction);
      toast({
        title: "Expense Added",
        description: `₹${amount} expense for ${description} has been recorded.`
      });
    }

    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Record Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <ExpenseFormFields
          amount={amount}
          setAmount={setAmount}
          description={description}
          setDescription={setDescription}
          date={date}
          setDate={setDate}
          spentBy={spentBy}
          setSpentBy={setSpentBy}
          category={category}
          setCategory={setCategory}
          people={people}
          getDaysInMonth={getDaysInMonth}
        />

        <Button onClick={handleAddExpense} className="w-full mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
