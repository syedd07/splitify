
import React from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Transaction, Person, CreditCard } from '@/types/BillSplitter';

interface TransactionHistoryProps {
  transactions: Transaction[];
  people: Person[];
  creditCards: CreditCard[];
  onDeleteTransaction: (transactionId: string) => void;
  month: string;
  year: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  people,
  creditCards,
  onDeleteTransaction,
  month,
  year
}) => {
  const getCreditCardDisplay = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    return card ? `${card.card_name} (*${card.last_four_digits})` : 'Unknown Card';
  };

  // Sort transactions by date in descending order (latest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseInt(a.date);
    const dateB = parseInt(b.date);
    return dateB - dateA;
  });

  const expenseTransactions = sortedTransactions.filter(t => t.type === 'expense');
  const paymentTransactions = sortedTransactions.filter(t => t.type === 'payment');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Transaction History
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
                  const person = people.find(p => p.id === transaction.spentBy);
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.description}</span>
                          <Badge 
                            variant={transaction.isCommonSplit ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {transaction.isCommonSplit ? 'Common Split' : transaction.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {person?.name} • {transaction.date} {months[parseInt(month) - 1]} {year}
                          {transaction.creditCardId && (
                            <span className="ml-2 text-blue-600">
                              • {getCreditCardDisplay(transaction.creditCardId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-600">₹{transaction.amount.toFixed(2)}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                  const person = people.find(p => p.id === transaction.spentBy);
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
                          {person?.name} • {transaction.date} {months[parseInt(month) - 1]} {year}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">₹{transaction.amount.toFixed(2)}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
  );
};

export default TransactionHistory;
