
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
      
      // Total amount this person needs to pay (personal + their share of common)
      const totalOwed = personalExpenses + commonPerPerson;
      
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

  const getTransactionsByPerson = () => {
    const transactionsByPerson: { [key: string]: Transaction[] } = {};
    
    people.forEach(person => {
      transactionsByPerson[person.id] = transactions.filter(t => t.spentBy === person.id);
    });
    
    return transactionsByPerson;
  };

  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const transactionsByPerson = getTransactionsByPerson();

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
            .person-section { margin: 20px 0; page-break-inside: avoid; }
            .person-header { background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Credit Card Bill Split</h1>
            <h2>${month} ${year}</h2>
            <p>Card Owner: ${cardOwner?.name || 'N/A'}</p>
          </div>
          
          <div class="summary">
            <h3>Payment Summary</h3>
            <table>
              <tr><th>Person</th><th>Personal Expenses</th><th>Common Share</th><th>Total Payable</th></tr>
              ${calculation.personBalances.map(balance => `
                <tr>
                  <td>${getPersonName(balance.personId)}</td>
                  <td>₹${balance.personalExpenses.toFixed(2)}</td>
                  <td>₹${balance.commonExpenses.toFixed(2)}</td>
                  <td class="total">₹${balance.totalOwed.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total</td>
                <td>₹${calculation.totalAmount - calculation.totalCommonExpenses}</td>
                <td>₹${calculation.totalCommonExpenses}</td>
                <td>₹${calculation.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="transaction-list">
            <h3>Transactions by Person</h3>
            ${people.map(person => `
              <div class="person-section">
                <div class="person-header">
                  <h4>${person.name}${person.isCardOwner ? ' (Card Owner)' : ''}</h4>
                </div>
                ${transactionsByPerson[person.id]?.length > 0 ? `
                  <table>
                    <tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th></tr>
                    ${transactionsByPerson[person.id].map(transaction => `
                      <tr class="${transaction.category}">
                        <td>${transaction.date}</td>
                        <td>${transaction.description}</td>
                        <td>₹${transaction.amount.toFixed(2)}</td>
                        <td>${transaction.category}</td>
                      </tr>
                    `).join('')}
                    <tr class="total">
                      <td colspan="2">Subtotal</td>
                      <td>₹${transactionsByPerson[person.id].reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </table>
                ` : '<p>No transactions</p>'}
              </div>
            `).join('')}
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
              <div className="text-2xl font-bold text-blue-600">₹{calculation.totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">₹{calculation.totalCommonExpenses.toFixed(2)}</div>
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
              Total Payable by Each Person
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
                        <div className="text-xl font-bold text-blue-600">
                          Total: ₹{balance.totalOwed.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>Personal expenses: ₹{balance.personalExpenses.toFixed(2)}</div>
                      <div>Common share: ₹{balance.commonExpenses.toFixed(2)}</div>
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
                        ₹{transaction.amount.toFixed(2)}
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
