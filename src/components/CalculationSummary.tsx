
import React from 'react';
import { Download, Calculator, Users, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person } from '@/types/BillSplitter';

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
  const { toast } = useToast();

  const calculateBalances = () => {
    return people.map(person => {
      const personalExpenses = transactions
        .filter(t => t.spentBy === person.id && !t.isCommonSplit)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const commonExpenses = transactions
        .filter(t => t.isCommonSplit && t.spentBy === person.id)
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        personId: person.id,
        personalExpenses,
        commonExpenses,
        totalOwed: personalExpenses + commonExpenses
      };
    });
  };

  const balances = calculateBalances();
  const totalAmount = balances.reduce((sum, b) => sum + b.totalOwed, 0);
  const totalCommonExpenses = balances.reduce((sum, b) => sum + b.commonExpenses, 0);

  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "PDF Generation Failed",
        description: "Please allow popups to generate PDF reports.",
        variant: "destructive"
      });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Card Bill Split - ${month} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin-bottom: 10px; }
            .header h2 { color: #059669; margin: 0; }
            .summary { margin: 20px 0; }
            .transaction-list { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f1f5f9; }
            .common { background-color: #dcfce7; }
            .personal { background-color: #dbeafe; }
            .person-section { margin: 20px 0; page-break-inside: avoid; }
            .person-header { 
              background-color: #f8fafc; 
              padding: 10px; 
              margin: 10px 0; 
              border-left: 4px solid #2563eb;
              font-weight: bold;
            }
            .card-owner { color: #7c3aed; }
            @media print {
              body { margin: 15px; }
              .person-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Credit Card Bill Split Summary</h1>
            <h2>${month} ${year}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h3>💰 Payment Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Personal Expenses</th>
                  <th>Common Share</th>
                  <th>Total Payable</th>
                </tr>
              </thead>
              <tbody>
                ${balances.map(balance => {
                  const person = people.find(p => p.id === balance.personId);
                  return `
                    <tr>
                      <td>${person?.name || ''}${person?.isCardOwner ? ' <span class="card-owner">(Card Owner)</span>' : ''}</td>
                      <td>₹${balance.personalExpenses.toFixed(2)}</td>
                      <td>₹${balance.commonExpenses.toFixed(2)}</td>
                      <td>₹${balance.totalOwed.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td><strong>Total</strong></td>
                  <td><strong>₹${balances.reduce((sum, b) => sum + b.personalExpenses, 0).toFixed(2)}</strong></td>
                  <td><strong>₹${totalCommonExpenses.toFixed(2)}</strong></td>
                  <td><strong>₹${totalAmount.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="transaction-list">
            <h3>📋 Transactions by Person</h3>
            ${people.map(person => {
              const personTransactions = transactions.filter(t => t.spentBy === person.id);
              if (personTransactions.length === 0) return '';
              
              return `
                <div class="person-section">
                  <div class="person-header">
                    ${person.name}${person.isCardOwner ? ' (Card Owner)' : ''}
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${personTransactions.map(transaction => `
                        <tr class="${transaction.isCommonSplit ? 'common' : 'personal'}">
                          <td>${transaction.date} ${month} ${year}</td>
                          <td>${transaction.description}${transaction.isCommonSplit ? ' (Common Split)' : ''}</td>
                          <td>₹${transaction.amount.toFixed(2)}</td>
                          <td>${transaction.isCommonSplit ? 'Common' : transaction.category}</td>
                        </tr>
                      `).join('')}
                      <tr class="total-row">
                        <td colspan="2"><strong>Subtotal</strong></td>
                        <td><strong>₹${personTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</strong></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Generated by Credit Ease Divide</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      toast({
        title: "PDF Ready",
        description: `Bill split summary for ${month} ${year} is ready for download.`
      });
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Bill Split Summary - {month} {year}
            </CardTitle>
            <Button 
              onClick={generatePDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">₹{totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">₹{totalCommonExpenses.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Common Expenses</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">{transactions.length}</div>
              <div className="text-sm text-muted-foreground">Total Transactions</div>
            </div>
          </div>

          {/* Individual Balances */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Individual Payment Summary
            </h3>
            
            <div className="space-y-3">
              {balances.map(balance => {
                const person = people.find(p => p.id === balance.personId);
                return (
                  <Card key={balance.personId} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lg">{person?.name}</span>
                          {person?.isCardOwner && (
                            <Badge variant="secondary" className="text-xs">
                              Card Owner
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">
                            ₹{balance.totalOwed.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>Personal: ₹{balance.personalExpenses.toFixed(2)}</div>
                        <div>Common Share: ₹{balance.commonExpenses.toFixed(2)}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Transaction Details
            </h3>
            
            <div className="space-y-2">
              {transactions.map(transaction => {
                const person = people.find(p => p.id === transaction.spentBy);
                return (
                  <Card key={transaction.id} className="transition-all hover:shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{transaction.description}</span>
                            <Badge 
                              variant={transaction.isCommonSplit ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {transaction.isCommonSplit ? 'Common' : transaction.category}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {person?.name} • {transaction.date} {month} {year}
                          </div>
                        </div>
                        <div className="text-lg font-semibold">
                          ₹{transaction.amount.toFixed(2)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalculationSummary;
