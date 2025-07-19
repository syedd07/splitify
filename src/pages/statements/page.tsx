import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, ArrowLeft, Filter, Search, FileText, Download } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionData {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  transaction_type: 'expense' | 'payment';
  category: string;
  spent_by_person_name: string;
  is_common_split: boolean;
  included_people: string[];
  created_at: string;
}

interface StatementData {
  id: string;
  credit_card_id: string;
  month: string;
  year: string;
  statement_data: {
    transactions: TransactionData[];
    summary: {
      total_expenses: number;
      total_payments: number;
      outstanding_balance: number;
      transaction_count: number;
    };
  };
  total_expenses: number;
  total_payments: number;
  outstanding_balance: number;
  transaction_count: number;
  generated_at: string;
  card_name: string;
}

const StatementsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Determine where user came from
  const previousPage = location.state?.from || '/transactions';
  
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [spentByUsers, setSpentByUsers] = useState<string[]>([]);
  
  // Get current month and year
  const getCurrentMonthIndex = () => new Date().getMonth();
  const allMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const months = allMonths.slice(0, getCurrentMonthIndex() + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => (currentYear - 2 + i).toString());

  // Filters
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSpentBy, setSelectedSpentBy] = useState<string>('all');
  const [transactionType, setTransactionType] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, selectedSpentBy, transactionType, category]);

  const fetchCards = async () => {
    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from('credit_cards')
        .select('id, card_name')
        .order('created_at');

      if (cardsError) throw cardsError;
      setCards(cardsData || []);
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cards",
        variant: "destructive",
      });
    }
  };

  const fetchStatement = async () => {
    if (!selectedCard || !selectedMonth || !selectedYear) {
      toast({
        title: "Missing Information",
        description: "Please select card, month, and year",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch statement from card_statements table
      const { data: statementsData, error: statementsError } = await (supabase as any)
        .from('card_statements')
        .select(`
          *,
          credit_cards!inner(card_name)
        `)
        .eq('credit_card_id', selectedCard)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .single();

      if (statementsError) {
        // If no statement found, try to generate one
        if (statementsError.code === 'PGRST116') {
          await generateStatement();
          return;
        }
        throw statementsError;
      }

      const formattedStatement = {
        ...statementsData,
        card_name: statementsData.credit_cards.card_name
      };

      setStatement(formattedStatement);
      
      // Extract transactions from statement data
      const statementTransactions = formattedStatement.statement_data?.transactions || [];
      setTransactions(statementTransactions);
      
      // Get unique spent by users for filter
      const uniqueUsers = [...new Set(statementTransactions.map((tx: TransactionData) => tx.spent_by_person_name))] as string[];
      setSpentByUsers(uniqueUsers);

    } catch (error: any) {
      console.error('Error fetching statement:', error);
      toast({
        title: "Error",
        description: "Failed to fetch statement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_card_statement', {
        p_credit_card_id: selectedCard,
        p_month: selectedMonth,
        p_year: selectedYear
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Statement Generated",
          description: "Statement has been generated successfully",
        });
        // Fetch the newly generated statement
        await fetchStatement();
      } else {
        throw new Error(data.error || 'Failed to generate statement');
      }
    } catch (error: any) {
      console.error('Error generating statement:', error);
      toast({
        title: "Error",
        description: "Failed to generate statement",
        variant: "destructive",
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.spent_by_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Spent by filter
    if (selectedSpentBy !== 'all') {
      filtered = filtered.filter(transaction => transaction.spent_by_person_name === selectedSpentBy);
    }

    // Transaction type filter
    if (transactionType !== 'all') {
      filtered = filtered.filter(transaction => transaction.transaction_type === transactionType);
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter(transaction => transaction.category === category);
    }

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const clearFilters = () => {
    setSelectedCard('');
    setSelectedMonth('');
    setSelectedYear(currentYear.toString());
    setSearchTerm('');
    setSelectedSpentBy('all');
    setTransactionType('all');
    setCategory('all');
    setStatement(null);
    setTransactions([]);
    setFilteredTransactions([]);
  };

  const getUniqueCategories = () => {
    return [...new Set(transactions.map(tx => tx.category).filter(cat => cat))];
  };

  const downloadStatementPDF = async () => {
    if (!statement || filteredTransactions.length === 0) {
      toast({
        title: "Error",
        description: "No statement data to download",
        variant: "destructive",
      });
      return;
    }

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({
          title: "PDF Generation Failed",
          description: "Please allow popups to generate PDF reports.",
          variant: "destructive",
        });
        return;
      }

      const getCurrentFormattedDate = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[now.getMonth()];
        const year = String(now.getFullYear()).slice(-2);
        return `${day} ${month} '${year}`;
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${statement.card_name} Statement - ${statement.month} ${statement.year}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #2563eb; margin-bottom: 10px; }
              .header h2 { color: #059669; margin: 0; }
              .summary { margin: 20px 0; }
              .section { margin: 30px 0; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #e0e7ff; }
              .total-row { font-weight: bold; background-color: #f1f5f9; }
              .expense { background-color: #fee2e2; }
              .payment { background-color: #dcfce7; }
              .amount-positive { color: #dc2626; font-weight: bold; }
              .amount-negative { color: #059669; font-weight: bold; }
              @media print {
                body { margin: 15px; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="https://raw.githubusercontent.com/syedd07/splitify/refs/heads/main/public/pwa-192x192.png" alt="Splitify" style="height:100px;width:100px;border-radius:8px;margin-bottom:8px; bgcolor: white;">
              <h1>${statement.card_name} Statement</h1>
              <h2>${statement.month} ${statement.year}</h2>
              <p>Generated on ${getCurrentFormattedDate()}</p>
            </div>
            
            <div class="summary">
              <h3>Financial Overview</h3>
              <table>
                <tr>
                  <td><strong>Total Expenses</strong></td>
                  <td><strong>Rs.${statement.total_expenses.toFixed(2)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Total Payments Made</strong></td>
                  <td><strong>Rs.${statement.total_payments.toFixed(2)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Outstanding Balance</strong></td>
                  <td><strong>Rs.${Math.abs(statement.outstanding_balance).toFixed(2)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Total Transactions</strong></td>
                  <td><strong>${statement.transaction_count}</strong></td>
                </tr>
              </table>
            </div>

            <div class="section">
              <h3>Transaction Details</h3>
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Spent By</th>
                    <th>Type</th>
                    <th>Split</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredTransactions.map((transaction, index) => `
                    <tr class="${transaction.transaction_type === 'expense' ? 'expense' : 'payment'}">
                      <td>${index + 1}</td>
                      <td>${formatDate(transaction.transaction_date)}</td>
                      <td>${transaction.description}</td>
                      <td>${transaction.category || 'N/A'}</td>
                      <td>${transaction.spent_by_person_name}</td>
                      <td>${transaction.transaction_type}</td>
                      <td>${transaction.is_common_split ? 'Split' : 'Individual'}</td>
                      <td class="${transaction.transaction_type === 'expense' ? 'amount-positive' : 'amount-negative'}">
                        ${transaction.transaction_type === 'expense' ? '-' : '+'}Rs.${transaction.amount.toFixed(2)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h3>Expense Summary</h3>
              <table>
                ${filteredTransactions.filter(t => t.transaction_type === 'expense').length === 0 ? 
                  `<tr><td colspan="2" style="text-align:center;color:#888;padding:12px;">No expense transactions found.</td></tr>` :
                  filteredTransactions.filter(t => t.transaction_type === 'expense').map(transaction => `
                    <tr class="expense">
                      <td>${formatDate(transaction.transaction_date)} - ${transaction.description}</td>
                      <td class="amount-positive">Rs.${transaction.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')
                }
                <tr class="total-row">
                  <td><strong>Total Expenses</strong></td>
                  <td><strong>Rs.${filteredTransactions.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>

            <div class="section">
              <h3>Payment Summary</h3>
              <table>
                ${filteredTransactions.filter(t => t.transaction_type === 'payment').length === 0 ? 
                  `<tr><td colspan="2" style="text-align:center;color:#888;padding:12px;">No payment transactions found.</td></tr>` :
                  filteredTransactions.filter(t => t.transaction_type === 'payment').map(transaction => `
                    <tr class="payment">
                      <td>${formatDate(transaction.transaction_date)} - ${transaction.description}</td>
                      <td class="amount-negative">Rs.${transaction.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')
                }
                <tr class="total-row">
                  <td><strong>Total Payments</strong></td>
                  <td><strong>Rs.${filteredTransactions.filter(t => t.transaction_type === 'payment').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
              <span>Generated by Splitify - <a href="https://ccardly.netlify.app" style="color:#2563eb;text-decoration:none;">Splitify</a></span>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        toast({
          title: "PDF Ready",
          description: `Statement for ${statement.card_name} - ${statement.month} ${statement.year} is ready for download.`,
        });
      }, 500);

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(previousPage)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Bank Statement View
              </h1>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Statement Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Card Filter */}
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Card" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.card_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month Filter */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Filter */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={fetchStatement} 
                disabled={!selectedCard || !selectedMonth || !selectedYear || loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {loading ? 'Loading...' : 'Get Statement'}
              </Button>
              
              <Button onClick={clearFilters} variant="outline">
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statement Summary */}
        {statement && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{statement.card_name} - {statement.month} {statement.year}</span>
                <Badge variant="outline">
                  {statement.transaction_count} Transactions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(statement.total_expenses)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(statement.total_payments)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className={`text-2xl font-bold ${
                    statement.outstanding_balance > 0 ? 'text-red-600' : 
                    statement.outstanding_balance < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {formatCurrency(Math.abs(statement.outstanding_balance))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Filters */}
        {transactions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Transaction Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Spent By Filter */}
                <Select value={selectedSpentBy} onValueChange={setSelectedSpentBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {spentByUsers.map(user => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Transaction Type Filter */}
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueCategories().map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Results Count */}
                <div className="flex items-center justify-center bg-gray-50 rounded-md px-3">
                  <span className="text-sm text-muted-foreground">
                    {filteredTransactions.length} of {transactions.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Statement Table */}
        {!statement ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">Select card, month, and year to view statement</p>
              <p className="text-sm text-muted-foreground">Use the filters above and click "Get Statement"</p>
            </CardContent>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No transactions found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>Transaction Statement</CardTitle>
                <Button
                  onClick={downloadStatementPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">S.No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Spent By</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Split</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction, index) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          {transaction.category && (
                            <Badge variant="outline" className="capitalize">
                              {transaction.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{transaction.spent_by_person_name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={transaction.transaction_type === 'expense' ? 'destructive' : 'default'}
                          >
                            {transaction.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.is_common_split ? (
                            <Badge variant="secondary">Split</Badge>
                          ) : (
                            <Badge variant="outline">Individual</Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          transaction.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.transaction_type === 'expense' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StatementsPage;