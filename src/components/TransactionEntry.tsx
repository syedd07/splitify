
import React from 'react';
import { Receipt, Banknote, CreditCard as CreditCardIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';
import ExpenseForm from '@/components/transaction/ExpenseForm';
import PaymentForm from '@/components/transaction/PaymentForm';
import TransactionHistory from '@/components/transaction/TransactionHistory';

interface TransactionEntryProps {
  people: Person[];
  creditCards: CreditCard[];
  selectedCard?: CreditCard | null;
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  transactions: Transaction[];
  month: string;
  year: string;
}

const TransactionEntry: React.FC<TransactionEntryProps> = ({
  people,
  creditCards,
  selectedCard,
  onAddTransaction,
  onDeleteTransaction,
  transactions,
  month,
  year
}) => {
  return (
    <div className="space-y-6">
      {/* Show selected card display */}
      {selectedCard && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Using: {selectedCard.card_name} (*{selectedCard.last_four_digits})
            </span>
          </div>
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
          <ExpenseForm
            people={people}
            selectedCard={selectedCard}
            onAddTransaction={onAddTransaction}
            month={month}
            year={year}
          />
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <PaymentForm
            people={people}
            onAddTransaction={onAddTransaction}
            month={month}
            year={year}
          />
        </TabsContent>
      </Tabs>

      {/* Transaction History */}
      <TransactionHistory
        transactions={transactions}
        people={people}
        creditCards={creditCards}
        onDeleteTransaction={onDeleteTransaction}
        month={month}
        year={year}
      />
    </div>
  );
};

export default TransactionEntry;
