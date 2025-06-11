import React from 'react';
import { Download, Calculator, Users, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Transaction, Person, PersonBalance } from '@/types/BillSplitter';

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

  const calculateBalances = (): PersonBalance[] => {
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
    const docDefinition = {
      content: [
        {
          text: 'Credit Card Bill Split Summary',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          text: `${month} ${year}`,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },
        {
          text: 'Payment Summary',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Person', style: 'tableHeader' },
                { text: 'Personal Expenses', style: 'tableHeader' },
                { text: 'Common Share', style: 'tableHeader' },
                { text: 'Total Payable', style: 'tableHeader' }
              ],
              ...balances.map(balance => {
                const person = people.find(p => p.id === balance.personId);
                return [
                  { text: person?.name || '', style: 'tableCell' },
                  { text: `₹${balance.personalExpenses.toFixed(2)}`, style: 'tableCell' },
                  { text: `₹${balance.commonExpenses.toFixed(2)}`, style: 'tableCell' },
                  { text: `₹${balance.totalOwed.toFixed(2)}`, style: 'tableCell' }
                ];
              }),
              [
                { text: 'Total', style: 'tableCellBold' },
                { text: `₹${balances.reduce((sum, b) => sum + b.personalExpenses, 0).toFixed(2)}`, style: 'tableCellBold' },
                { text: `₹${totalCommonExpenses.toFixed(2)}`, style: 'tableCellBold' },
                { text: `₹${totalAmount.toFixed(2)}`, style: 'tableCellBold' }
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        {
          text: 'Transactions by Person',
          style: 'sectionHeader',
          margin: [0, 30, 0, 10]
        },
        ...people.map(person => {
          const personTransactions = transactions.filter(t => 
            (t.spentBy === person.id && !t.isCommonSplit) || 
            (t.isCommonSplit && t.spentBy === person.id)
          );

          if (personTransactions.length === 0) return [];

          return [
            {
              text: `${person.name}${person.isCardOwner ? ' (Card Owner)' : ''}`,
              style: 'personHeader',
              margin: [0, 15, 0, 5]
            },
            {
              table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Date', style: 'tableHeader' },
                    { text: 'Description', style: 'tableHeader' },
                    { text: 'Amount', style: 'tableHeader' },
                    { text: 'Category', style: 'tableHeader' }
                  ],
                  ...personTransactions.map(transaction => [
                    { text: transaction.date, style: 'tableCell' },
                    { text: transaction.description, style: 'tableCell' },
                    { text: `₹${transaction.amount.toFixed(2)}`, style: 'tableCell' },
                    { text: transaction.isCommonSplit ? 'common' : transaction.category, style: 'tableCell' }
                  ]),
                  [
                    { text: 'Subtotal', style: 'tableCellBold', colSpan: 2 },
                    {},
                    { text: `₹${personTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`, style: 'tableCellBold' },
                    { text: '', style: 'tableCellBold' }
                  ]
                ]
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 10]
            }
          ];
        }).flat()
      ],
      styles: {
        header: { fontSize: 20, bold: true },
        subheader: { fontSize: 16, bold: true },
        sectionHeader: { fontSize: 14, bold: true },
        personHeader: { fontSize: 12, bold: true },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#f0f0f0' },
        tableCell: { fontSize: 9 },
        tableCellBold: { fontSize: 9, bold: true }
      }
    };

    try {
      import('pdfmake/build/pdfmake').then(pdfMakeModule => {
        const pdfMake = pdfMakeModule.default;
        import('pdfmake/build/vfs_fonts').then(vfsModule => {
          pdfMake.vfs = vfsModule.default.pdfMake.vfs;
          pdfMake.createPdf(docDefinition).download(`credit-card-split-${month}-${year}.pdf`);
          
          toast({
            title: "PDF Downloaded",
            description: `Bill split summary for ${month} ${year} has been downloaded successfully.`,
          });
        });
      });
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
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
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">₹{totalAmount.toFixed(2)}</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Common Expenses</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalCommonExpenses.toFixed(2)}</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total People</p>
                  <p className="text-2xl font-bold text-purple-600">{people.length}</p>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Payment Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-3 text-left">Person</th>
                      <th className="border border-gray-200 p-3 text-right">Personal Expenses</th>
                      <th className="border border-gray-200 p-3 text-right">Common Share</th>
                      <th className="border border-gray-200 p-3 text-right">Total Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((balance) => {
                      const person = people.find(p => p.id === balance.personId);
                      return (
                        <tr key={balance.personId} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-3">
                            <div className="flex items-center gap-2">
                              {person?.name}
                              {person?.isCardOwner && (
                                <Badge variant="default" className="text-xs">Card Owner</Badge>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3 text-right font-mono">
                            ₹{balance.personalExpenses.toFixed(2)}
                          </td>
                          <td className="border border-gray-200 p-3 text-right font-mono">
                            ₹{balance.commonExpenses.toFixed(2)}
                          </td>
                          <td className="border border-gray-200 p-3 text-right font-mono font-semibold">
                            ₹{balance.totalOwed.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border border-gray-200 p-3">Total</td>
                      <td className="border border-gray-200 p-3 text-right font-mono">
                        ₹{balances.reduce((sum, b) => sum + b.personalExpenses, 0).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 p-3 text-right font-mono">
                        ₹{totalCommonExpenses.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 p-3 text-right font-mono">
                        ₹{totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Transaction Details
              </h3>
              <div className="space-y-4">
                {people.map(person => {
                  const personTransactions = transactions.filter(t => 
                    (t.spentBy === person.id && !t.isCommonSplit) || 
                    (t.isCommonSplit && t.spentBy === person.id)
                  );

                  if (personTransactions.length === 0) return null;

                  return (
                    <Card key={person.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{person.name}</h4>
                          {person.isCardOwner && (
                            <Badge variant="default" className="text-xs">Card Owner</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 text-sm">Date</th>
                                <th className="text-left p-2 text-sm">Description</th>
                                <th className="text-right p-2 text-sm">Amount</th>
                                <th className="text-left p-2 text-sm">Category</th>
                              </tr>
                            </thead>
                            <tbody>
                              {personTransactions.map(transaction => (
                                <tr key={transaction.id} className="border-b border-gray-100">
                                  <td className="p-2 text-sm">{transaction.date}</td>
                                  <td className="p-2 text-sm">{transaction.description}</td>
                                  <td className="p-2 text-sm text-right font-mono">₹{transaction.amount.toFixed(2)}</td>
                                  <td className="p-2 text-sm">
                                    <Badge variant={transaction.isCommonSplit ? 'default' : 'secondary'} className="text-xs">
                                      {transaction.isCommonSplit ? 'common' : transaction.category}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-gray-300 font-semibold">
                                <td className="p-2 text-sm" colSpan={2}>Subtotal</td>
                                <td className="p-2 text-sm text-right font-mono">
                                  ₹{personTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                                </td>
                                <td className="p-2 text-sm"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalculationSummary;
