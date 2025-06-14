import React, { useState } from 'react';
import { Plus, Users, Calculator, Download, CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PersonManager from '@/components/PersonManager';
import TransactionEntry from '@/components/TransactionEntry';
import CalculationSummary from '@/components/CalculationSummary';
import { Transaction, Person } from '@/types/BillSplitter';

const Index = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentStep, setCurrentStep] = useState<'setup' | 'transactions' | 'summary'>('setup');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Only show current year and past 2 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => (currentYear - 2 + i).toString());

  const handleStartSplitting = () => {
    if (selectedMonth && selectedYear && people.length >= 2) {
      setCurrentStep('transactions');
    }
  };

  const handleAddTransaction = (transaction: Transaction) => {
    if (transaction.type === 'expense' && transaction.category === 'common') {
      // For common expenses, create individual transactions for each person
      const amountPerPerson = transaction.amount / people.length;
      people.forEach(person => {
        const commonTransaction: Transaction = {
          ...transaction,
          id: `${Date.now()}-${person.id}`,
          amount: amountPerPerson,
          spentBy: person.id,
          isCommonSplit: true
        };
        setTransactions(prev => [...prev, commonTransaction]);
      });
    } else {
      setTransactions(prev => [...prev, { ...transaction, id: Date.now().toString() }]);
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleProceedToSummary = () => {
    setCurrentStep('summary');
  };

  const handleBackToSetup = () => {
    setCurrentStep('setup');
  };

  const handleBackToTransactions = () => {
    setCurrentStep('transactions');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Credit Ease Divide
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Split your credit card bills seamlessly with smart calculations and beautiful reports
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'setup' ? 'text-blue-600' : currentStep === 'transactions' || currentStep === 'summary' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'setup' ? 'bg-blue-600 text-white' : currentStep === 'transactions' || currentStep === 'summary' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="font-medium">Setup</span>
            </div>
            <div className={`w-8 h-1 ${currentStep === 'transactions' || currentStep === 'summary' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'transactions' ? 'text-blue-600' : currentStep === 'summary' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'transactions' ? 'bg-blue-600 text-white' : currentStep === 'summary' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-medium">Add Expenses & Payments</span>
            </div>
            <div className={`w-8 h-1 ${currentStep === 'summary' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'summary' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                <Calculator className="w-4 h-4" />
              </div>
              <span className="font-medium">Calculate</span>
            </div>
          </div>
        </div>

        {/* Setup Step */}
        {currentStep === 'setup' && (
          <div className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Credit Card Bill Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Month</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PersonManager people={people} setPeople={setPeople} />

            <div className="text-center">
              <Button 
                onClick={handleStartSplitting}
                disabled={!selectedMonth || !selectedYear || people.length < 2}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                Start Adding Expenses & Payments
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Entry Step */}
        {currentStep === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                onClick={handleBackToSetup}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Setup
              </Button>
            </div>
            
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>
                  Managing expenses and payments for {selectedMonth} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionEntry 
                  people={people} 
                  onAddTransaction={handleAddTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  transactions={transactions}
                  month={selectedMonth}
                  year={selectedYear}
                />
              </CardContent>
            </Card>

            {transactions.length > 0 && (
              <div className="text-center">
                <Button 
                  onClick={handleProceedToSummary}
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  Calculate Split
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Summary Step */}
        {currentStep === 'summary' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                onClick={handleBackToTransactions}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Expenses
              </Button>
            </div>
            
            <CalculationSummary 
              people={people}
              transactions={transactions}
              month={selectedMonth}
              year={selectedYear}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
