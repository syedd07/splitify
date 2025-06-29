import React from "react";
import {
  Download,
  Calculator,
  Users,
  Receipt,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Transaction, Person, PersonBalance } from "@/types/BillSplitter";

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
  year,
}) => {
  const { toast } = useToast();

  const calculateBalances = (): PersonBalance[] => {
    return people.map((person) => {
      const matchesPerson = (t: Transaction) =>
        t.spentBy === person.id || t.spentBy === person.name;

      // Personal expenses (not common)
      const personalExpenses = transactions
        .filter(
          (t) => t.type === "expense" && matchesPerson(t) && !t.isCommonSplit
        )
        .reduce((sum, t) => sum + t.amount, 0);

      // Common expenses: split among only included people
      const commonExpenses = transactions
        .filter((t) => t.type === "expense" && t.isCommonSplit)
        .reduce((sum, t) => {
          // Use includedPeople if present, otherwise fallback to all people
          const included =
            Array.isArray(t.includedPeople) && t.includedPeople.length > 0
              ? t.includedPeople
              : people.map((p) => p.id);
          if (included.includes(person.id)) {
            return sum + t.amount / included.length;
          }
          return sum;
        }, 0);

      const totalPayments = transactions
        .filter((t) => t.type === "payment" && matchesPerson(t))
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = personalExpenses + commonExpenses;
      const netBalance = totalExpenses - totalPayments;

      return {
        personId: person.id,
        personalExpenses,
        commonExpenses,
        totalExpenses,
        totalPayments,
        netBalance,
      };
    });
  };

  const balances = calculateBalances();
  const totalExpenses = balances.reduce((sum, b) => sum + b.totalExpenses, 0);
  const totalPayments = balances.reduce((sum, b) => sum + b.totalPayments, 0);
  const totalCommonExpenses = balances.reduce(
    (sum, b) => sum + b.commonExpenses,
    0
  );
  const outstandingBalance = totalExpenses - totalPayments;

  // Sort transactions by date in descending order (latest first)
  const sortTransactionsByDate = (transactions: Transaction[]) => {
    return [...transactions].sort((a, b) => {
      const dateA = parseInt(a.date);
      const dateB = parseInt(b.date);
      return dateB - dateA; // Descending order (latest dates first)
    });
  };

  const expenseTransactions = sortTransactionsByDate(
    transactions.filter((t) => t.type === "expense")
  );
  const paymentTransactions = sortTransactionsByDate(
    transactions.filter((t) => t.type === "payment")
  );

  const generatePDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "PDF Generation Failed",
        description: "Please allow popups to generate PDF reports.",
        variant: "destructive",
      });
      return;
    }

    const formatDate = (dateStr: string) => {
      // Assumes dateStr is DD or DDMM or DDMMYYYY, adapt as needed
      // If only DD, just return with month/year
      if (dateStr.length <= 2) {
        return `${dateStr} ${month.slice(0, 3)} '${year.slice(-2)}`;
      }
      // If DDMM or DDMMYY
      if (dateStr.length === 4) {
        const day = dateStr.slice(0, 2);
        const mm = dateStr.slice(2, 4);
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const monthName = months[parseInt(mm, 10) - 1] || month.slice(0, 3);
        return `${day} ${monthName} '${year.slice(-2)}`;
      }
      // fallback
      return `${dateStr} ${month.slice(0, 3)} '${year.slice(-2)}`;
    };

    // ...inside generatePDF, before htmlContent...
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
          <title>Credit Card Bill Split - ${month} ${year}</title>
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
            .expense { background-color: #dbeafe; }
            .payment { background-color: #dcfce7; }
            .person-section { margin: 20px 0; page-break-inside: avoid; }
            .person-header { 
              background-color: #f8fafc; 
              padding: 10px; 
              margin: 10px 0; 
              border-left: 4px solid #2563eb;
              font-weight: bold;
            }
            .balance-positive { color: #dc2626; }
            .balance-negative { color: #059669; }
            .card-owner { color: #7c3aed; }
            @media print {
              body { margin: 15px; }
              .person-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://raw.githubusercontent.com/syedd07/splitify/refs/heads/main/public/pwa-192x192.png" alt="Splitify" style="height:100px;width:100px;border-radius:8px;margin-bottom:8px; bgcolor: white;">
            <h1>Credit Card Bill Split Summary</h1>
            <h2>${month} ${year}</h2>
            <p>Generated on ${getCurrentFormattedDate()}</p>
          </div>
          
          <div class="summary">
            <h3>💰 Financial Overview</h3>
            <table>
              <tr>
                <td><strong>Total Expenses</strong></td>
                <td><strong>₹${totalExpenses.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td><strong>Total Payments Made</strong></td>
                <td><strong>₹${totalPayments.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td><strong>Outstanding Balance</strong></td>
                <td><strong>₹${outstandingBalance.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h3>👥 Individual Balance Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Personal Expenses</th>
                  <th>Common Share</th>
                  <th>Total Expenses</th>
                  <th>Payments Made</th>
                  <th>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                ${balances
        .map((balance) => {
          const person = people.find(
            (p) => p.id === balance.personId
          );
          const balanceClass =
            balance.netBalance > 0
              ? "balance-positive"
              : "balance-negative";
          const balanceText =
            balance.netBalance > 0
              ? `Owes ₹${balance.netBalance.toFixed(2)}`
              : balance.netBalance < 0
                ? `Should receive ₹${Math.abs(
                  balance.netBalance
                ).toFixed(2)}`
                : "Settled";
          return `
                    <tr>
                      <td>${person?.name || ""}${person?.isCardOwner
              ? ' <span class="card-owner">(Card Owner)</span>'
              : ""
            }</td>
                      <td>₹${balance.personalExpenses.toFixed(2)}</td>
                      <td>₹${balance.commonExpenses.toFixed(2)}</td>
                      <td>₹${balance.totalExpenses.toFixed(2)}</td>
                      <td>₹${balance.totalPayments.toFixed(2)}</td>
                      <td class="${balanceClass}"><strong>${balanceText}</strong></td>
                    </tr>
                  `;
        })
        .join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>💳 Expense Transactions</h3>
            ${people.every(
          (person) =>
            sortTransactionsByDate(
              expenseTransactions.filter(
                (t) => t.spentBy === person.id || t.spentBy === person.name
              )
            ).length === 0
        )
        ? `<div style="color:#888;padding:12px;">No expense transactions found for any user.</div>`
        : people
          .map((person) => {
            const personExpenses = sortTransactionsByDate(
              expenseTransactions.filter(
                (t) => t.spentBy === person.id || t.spentBy === person.name
              )
            );
            if (personExpenses.length === 0) {
              return `<div class="person-section"><div class="person-header">${person.name} - No expenses recorded.</div></div>`;
            }
            return `
                        <div class="person-section">
                          <div class="person-header" style="display:flex;align-items:center;gap:8px;">
                            ${person.name}${person.isCardOwner ? ' <span class="card-owner">(Card Owner)</span>' : ""
              } - Expenses
                          </div>
                          <table>
                            <thead>
                              <tr style="background:#e0e7ff;">
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Category</th>
                                <th>Included People</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${personExpenses
                .map(
                  (transaction) => `
                                <tr class="expense">
                                  <td>${formatDate(transaction.date)}</td>
                                  <td>${transaction.description}${transaction.isCommonSplit ? " (Common Split)" : ""
                    }</td>
                                  <td>₹${transaction.amount.toFixed(2)}</td>
                                  <td>${transaction.isCommonSplit
                      ? "Common"
                      : transaction.category
                    }</td>
                                  <td>
                                    ${transaction.isCommonSplit &&
                      Array.isArray(transaction.includedPeople)
                      ? transaction.includedPeople
                        .map((pid) => {
                          const p = people.find(
                            (pp) => pp.id === pid
                          );
                          return p ? p.name : pid;
                        })
                        .join(", ")
                      : "-"
                    }
                                  </td>
                                </tr>
                              `
                )
                .join("")}
                              <tr class="total-row">
                                <td colspan="2"><strong>Subtotal</strong></td>
                                <td><strong>₹${personExpenses
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}</strong></td>
                                <td colspan="2"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      `;
          })
          .join("")
      }
          </div>

          <div class="section">
            <h3>🤝 Common Expenses</h3>
            ${expenseTransactions.filter((t) => t.isCommonSplit).length === 0
        ? `<div style="color:#888;padding:12px;">No common expenses recorded for this period.</div>`
        : `
                  <table>
                    <thead>
                      <tr style="background:#f3e8ff;">
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Paid By</th>
                        <th>Included People</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${sortTransactionsByDate(
          expenseTransactions.filter((t) => t.isCommonSplit)
        )
          .map((transaction) => {
            const payer = people.find(
              (p) =>
                p.id === transaction.spentBy ||
                p.name === transaction.spentBy
            );
            return `
                            <tr class="expense">
                              <td>${formatDate(transaction.date)}</td>
                              <td>${transaction.description}</td>
                              <td>₹${transaction.amount.toFixed(2)}</td>
                              <td>${payer ? payer.name : transaction.spentBy}</td>
                              <td>
                                ${Array.isArray(transaction.includedPeople)
                ? transaction.includedPeople
                  .map((pid) => {
                    const p = people.find((pp) => pp.id === pid);
                    return p ? p.name : pid;
                  })
                  .join(", ")
                : "-"
              }
                              </td>
                            </tr>
                          `;
          })
          .join("")}
                    </tbody>
                  </table>
                `
      }
          </div>

          <div class="section">
            <h3>💰 Payment Transactions</h3>
            ${people.every(
        (person) =>
          sortTransactionsByDate(
            paymentTransactions.filter((t) => t.spentBy === person.id)
          ).length === 0
      )
        ? `<div style="color:#888;padding:12px;">No payment transactions found for any user.</div>`
        : people
          .map((person) => {
            const personPayments = sortTransactionsByDate(
              paymentTransactions.filter((t) => t.spentBy === person.id)
            );
            if (personPayments.length === 0) {
              return `<div class="person-section"><div class="person-header">${person.name} - No payments recorded.</div></div>`;
            }
            return `
                        <div class="person-section">
                          <div class="person-header">
                            ${person.name}${person.isCardOwner ? " (Card Owner)" : ""} - Payments
                          </div>
                          <table>
                            <thead>
                              <tr style="background:#dcfce7;">
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${personPayments
                .map(
                  (transaction) => `
                                <tr class="payment">
                                  <td>${formatDate(transaction.date)}</td>
                                  <td>${transaction.description}</td>
                                  <td>₹${transaction.amount.toFixed(2)}</td>
                                </tr>
                              `
                )
                .join("")}
                              <tr class="total-row">
                                <td><strong>Total Payments</strong></td>
                                <td></td>
                                <td><strong>₹${personPayments
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}</strong></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      `;
          })
          .join("")
      }
          </div>

          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
            <span>Generated by Splitify &mdash; <a href="https://ccardly.netlify.app" style="color:#2563eb;text-decoration:none;">Splitify</a></span>
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
        description: `Bill split summary for ${month} ${year} is ready for download.`,
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
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                ₹{totalExpenses.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Expenses
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                ₹{totalPayments.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Payments
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">
                ₹{outstandingBalance.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Outstanding Balance
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">
                {expenseTransactions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Transactions
              </div>
            </div>
          </div>

          {/* Individual Balances */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Individual Balance Summary
            </h3>

            <div className="space-y-3">
              {balances.map((balance) => {
                const person = people.find((p) => p.id === balance.personId);
                const isOwing = balance.netBalance > 0;
                const isReceiving = balance.netBalance < 0;
                const isSettled = balance.netBalance === 0;

                return (
                  <Card
                    key={balance.personId}
                    className="transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lg">
                            {person?.name}
                          </span>
                          {person?.isCardOwner && (
                            <Badge variant="secondary" className="text-xs">
                              Card Owner
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xl font-bold ${isOwing
                                ? "text-red-600"
                                : isReceiving
                                  ? "text-green-600"
                                  : "text-gray-600"
                              }`}
                          >
                            {isOwing
                              ? `Due ₹${balance.netBalance.toFixed(2)}`
                              : isReceiving
                                ? `Receives ₹${Math.abs(
                                  balance.netBalance
                                ).toFixed(2)}`
                                : "Settled ✓"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          Personal: ₹{balance.personalExpenses.toFixed(2)}
                        </div>
                        <div>Common: ₹{balance.commonExpenses.toFixed(2)}</div>
                        <div>
                          Total Exp: ₹{balance.totalExpenses.toFixed(2)}
                        </div>
                        <div>Payments: ₹{balance.totalPayments.toFixed(2)}</div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expenses */}
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Expenses ({expenseTransactions.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expenseTransactions.map((transaction) => {
                    const person = people.find(
                      (p) =>
                        p.id === transaction.spentBy ||
                        p.name === transaction.spentBy
                    );
                    return (
                      <Card
                        key={transaction.id}
                        className="transition-all hover:shadow-sm border-blue-100"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {transaction.description}
                                </span>
                                <Badge
                                  variant={
                                    transaction.isCommonSplit
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {transaction.isCommonSplit
                                    ? "Common"
                                    : transaction.category}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {person?.name} • {transaction.date} {month}{" "}
                                {year}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-blue-600">
                              ₹{transaction.amount.toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Payments */}
              <div className="space-y-2">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Payments ({paymentTransactions.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {paymentTransactions.map((transaction) => {
                    const person = people.find(
                      (p) =>
                        p.id === transaction.spentBy ||
                        p.name === transaction.spentBy
                    );
                    return (
                      <Card
                        key={transaction.id}
                        className="transition-all hover:shadow-sm border-green-100"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {transaction.description}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-green-600 text-green-600"
                                >
                                  Payment
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {person?.name} • {transaction.date} {month}{" "}
                                {year}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-green-600">
                              ₹{transaction.amount.toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalculationSummary;
