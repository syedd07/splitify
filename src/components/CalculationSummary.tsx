
import React from 'react';
import { Download, User, DollarSign, FileText, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Transaction, Person, SplitCalculation } from '@/types/BillSplitter';

interface CalculationSummaryProps {
  people: Person[];
  transactions: Transaction[];
  month: string;
  year: string;
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({
  people,
  transactions,
  month,
  year
}) => {
  const calculateSplit = (): SplitCalculation => {
    const totalCommonExpenses = transactions
      .filter(t => t.category === 'common')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const commonPerPerson = totalCommonExpenses / people.length;
    
    const personBalances = people.map(person => {
      const personalExpenses = transactions
        .filter(t => t.category === 'personal' && t.spentBy === person.id)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const commonExpensesPaid = transactions
        .filter(t => t.category === 'common' && t.spentBy === person.id)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalOwed = personalExpenses + commonPerPerson - commonExpensesPaid;
      
      return {
        personId: person.id,
        personalExpenses,
        commonExpenses: commonPerPerson,
        totalOwed
      };
    });

    return {
      personBalances,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalCommonExpenses
    };
  };

  const calculation = calculateSplit();
  const cardOwner = people.find(p => p.isCardOwner);
  
  const getPersonName = (id: string) => {
    return people.find(p => p.id === id)?.name || '';
  };

  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Card Bill Split - ${month} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin: 20px 0; }
            .transaction-list { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; }
            .common { background-color: #e8f5e8; }
            .personal { background-color: #f0f8ff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Credit Card Bill Split</h1>
            <h2>${month} ${year}</h2>
            <p>Card Owner: ${cardOwner?.name || 'N/A'}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <table>
              <tr><th>Person</th><th>Personal Expenses</th><th>Common Share</th><th>Amount Owed</th></tr>
              ${calculation.personBalances.map(balance => `
                <tr>
                  <td>${getPersonName(balance.personId)}</td>
                  <td>$${balance.personalExpenses.toFixed(2)}</td>
                  <td>$${balance.commonExpenses.toFixed(2)}</td>
                  <td class="${balance.totalOwed > 0 ? 'total' : ''}">$${Math.abs(balance.totalOwed).toFixed(2)} ${balance.totalOwed > 0 ? 'owed' : 'credit'}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="transaction-list">
            <h3>All Transactions</h3>
            <table>
              <tr><th>Date</th><th>Description</th><th>Amount</th><th>Paid By</th><th>Category</th></tr>
              ${transactions.map(transaction => `
                <tr class="${transaction.category}">
                  <td>${transaction.date}</td>
                  <td>${transaction.description}</td>
                  <td>$${transaction.amount.toFixed(2)}</td>
                  <td>${getPersonName(transaction.spentBy)}</td>
                  <td>${transaction.category}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="2">Total</td>
                <td>$${calculation.totalAmount.toFixed(2)}</td>
                <td colspan="2"></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bill Split Summary - {month} {year}</span>
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">${calculation.totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${calculation.totalCommonExpenses.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Common Expenses</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{transactions.length}</div>
              <div className="text-sm text-muted-foreground">Transactions</div>
            </div>
          </div>

          <Separator />

          {/* Individual Balances */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Individual Balances
            </h3>
            
            {calculation.personBalances.map(balance => {
              const person = people.find(p => p.id === balance.personId);
              return (
                <Card key={balance.personId} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg">{person?.name}</span>
                        {person?.isCardOwner && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Card Owner
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${balance.totalOwed > 0 ? 'text-red-600' : balance.totalOwed < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {balance.totalOwed > 0 && 'Owes '}
                          {balance.totalOwed < 0 && 'Gets '}
                          ${Math.abs(balance.totalOwed).toFixed(2)}
                          {balance.totalOwed === 0 && 'Even'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>Personal expenses: ${balance.personalExpenses.toFixed(2)}</div>
                      <div>Common share: ${balance.commonExpenses.toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Transaction Details
            </h3>
            
            <div className="space-y-2">
              {transactions.map(transaction => (
                <Card key={transaction.id} className="transition-all hover:shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.description}</span>
                          <Badge variant={transaction.category === 'common' ? 'default' : 'secondary'}>
                            {transaction.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {getPersonName(transaction.spentBy)} • {transaction.date}
                        </div>
                      </div>
                      <div className="text-lg font-semibold">
                        ${transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalculationSummary;
