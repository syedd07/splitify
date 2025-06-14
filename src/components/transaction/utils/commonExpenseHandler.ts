
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';

interface CreateCommonExpenseParams {
  amount: string;
  description: string;
  date: string;
  people: Person[];
  selectedCard?: CreditCard | null;
  onAddTransaction: (transaction: Transaction) => void;
  toast: (options: any) => void;
}

export const createCommonExpense = ({
  amount,
  description,
  date,
  people,
  selectedCard,
  onAddTransaction,
  toast
}: CreateCommonExpenseParams) => {
  const totalAmount = parseFloat(amount);
  const splitAmount = totalAmount / people.length;
  
  console.log('=== COMMON EXPENSE SPLIT DEBUG ===');
  console.log('Total amount entered:', totalAmount);
  console.log('Number of people:', people.length);
  console.log('Split amount per person:', splitAmount);
  console.log('People list:', people.map(p => ({ id: p.id, name: p.name })));
  
  // Create individual transactions for each person - process all at once
  const allTransactions: Transaction[] = people.map((person, index) => {
    const baseTimestamp = Date.now();
    const uniqueId = `common-${baseTimestamp}-${index}-${person.id}`;
    
    const transaction: Transaction = {
      id: uniqueId,
      amount: splitAmount,
      description: `${description} (Common Split)`,
      date,
      type: 'expense',
      category: 'personal', // Individual portion of common expense
      spentBy: person.id,
      creditCardId: selectedCard?.id,
      isCommonSplit: true
    };

    console.log(`Creating transaction ${index + 1}:`, {
      id: transaction.id,
      person: person.name,
      amount: transaction.amount,
      spentBy: transaction.spentBy
    });

    return transaction;
  });

  // Add all transactions at once
  allTransactions.forEach(transaction => {
    console.log('Adding transaction to state:', transaction.id, 'for person:', people.find(p => p.id === transaction.spentBy)?.name);
    onAddTransaction(transaction);
  });

  toast({
    title: "Common Expense Added",
    description: `₹${totalAmount} expense for ${description} has been split equally among ${people.length} people (₹${splitAmount.toFixed(2)} each).`
  });

  console.log('=== END COMMON EXPENSE SPLIT DEBUG ===');
};
