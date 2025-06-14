
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calculator, CreditCard as CreditCardIcon, Users, DollarSign, PieChart, LogOut, User, ArrowRight, ArrowLeft, Calendar, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PersonManager from '@/components/PersonManager';
import TransactionEntry from '@/components/TransactionEntry';
import CalculationSummary from '@/components/CalculationSummary';
import type { Person, Transaction, CreditCard } from '@/types/BillSplitter';

const Index = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Get current date for defaults
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const currentYear = currentDate.getFullYear().toString();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        await fetchCreditCards();
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        fetchCreditCards();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCreditCards = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) throw error;
      
      if (data && data.length === 0) {
        toast({
          title: "No Credit Cards Found",
          description: "Please add a credit card first to start splitting bills.",
          variant: "destructive",
        });
        navigate('/onboarding');
        return;
      }
      
      setCreditCards(data || []);
      
      // Get selected card from localStorage or use primary/first card
      const storedCardId = localStorage.getItem('selectedCardId');
      let cardToSelect = null;
      
      if (storedCardId && data) {
        cardToSelect = data.find(card => card.id === storedCardId);
      }
      
      if (!cardToSelect && data && data.length > 0) {
        const primaryCard = data.find(card => card.is_primary);
        cardToSelect = primaryCard || data[0];
      }
      
      setSelectedCard(cardToSelect);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch credit cards",
        variant: "destructive",
      });
    }
  };

  const handleCardChange = () => {
    navigate('/onboarding');
  };

  // Generate months array
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Generate years array (from 2020 to current year only)
  const generateYears = () => {
    const years = [];
    const startYear = 2020;
    for (let year = startYear; year <= currentDate.getFullYear(); year++) {
      years.push(year.toString());
    }
    return years;
  };

  // Filter months to not include future months for current year
  const getAvailableMonths = () => {
    if (selectedYear === currentYear) {
      return months.filter(month => parseInt(month.value) <= currentDate.getMonth() + 1);
    }
    return months;
  };

  const addPerson = (newPerson: Person) => {
    setPeople([...people, newPerson]);
  };

  const deletePerson = (id: string) => {
    setPeople(people.filter(person => person.id !== id));
  };

  const addTransaction = (newTransaction: Transaction) => {
    // Auto-assign the selected card to the transaction if not already set
    const transactionWithCard = {
      ...newTransaction,
      creditCardId: newTransaction.creditCardId || selectedCard?.id
    };
    setTransactions([...transactions, transactionWithCard]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(transaction => transaction.id !== id));
  };

  const handleSignOut = async () => {
    localStorage.removeItem('selectedCardId');
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep1 = people.length >= 2;
  const canProceedFromStep2 = transactions.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Credit Ease Divide
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button onClick={() => navigate('/onboarding')} variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  My Cards
                </Button>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/auth?mode=signup')} variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            )}
          </div>
        </div>

        {/* Welcome Section */}
        {user && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Welcome, {user.user_metadata?.full_name || user.email}!
            </h2>
            <p className="text-lg text-muted-foreground">
              Start splitting bills with ease
            </p>
          </div>
        )}

        {/* Selected Card Display */}
        {selectedCard && (
          <div className="mb-8">
            <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-6 rounded bg-gradient-to-r ${
                      selectedCard.card_type?.toLowerCase() === 'visa' ? 'from-blue-600 to-blue-800' :
                      selectedCard.card_type?.toLowerCase() === 'mastercard' ? 'from-red-600 to-orange-600' :
                      selectedCard.card_type?.toLowerCase() === 'amex' ? 'from-green-600 to-teal-600' :
                      'from-gray-600 to-gray-800'
                    } flex items-center justify-center`}>
                      <CreditCardIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Using: {selectedCard.card_name}</p>
                      <p className="text-sm text-muted-foreground">•••• {selectedCard.last_four_digits}</p>
                    </div>
                  </div>
                  <Button onClick={handleCardChange} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Change Card
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-center items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <div className={`ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step === 1 && 'Setup & People'}
                  {step === 2 && 'Enter Transactions'}
                  {step === 3 && 'View Summary'}
                </div>
                {step < 3 && (
                  <ArrowRight className={`w-4 h-4 mx-4 ${
                    currentStep > step ? 'text-blue-600' : 'text-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 1 && (
            <Card className="bg-white/80 backdrop-blur-sm shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Step 1: Setup & Manage People
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Month and Year Selection */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Select Month & Year
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="month-select">Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger id="month-select">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMonths().map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="year-select">Year</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="year-select">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected period: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                </div>

                <PersonManager 
                  people={people} 
                  setPeople={setPeople}
                  cardOwnerName={user?.user_metadata?.full_name || user?.email || "Card Owner"}
                />
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={nextStep} 
                    disabled={!canProceedFromStep1}
                    className="flex items-center gap-2"
                  >
                    Next: Enter Transactions
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="bg-white/80 backdrop-blur-sm shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Step 2: Enter Transactions for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionEntry 
                  people={people} 
                  creditCards={creditCards}
                  selectedCard={selectedCard}
                  onAddTransaction={addTransaction}
                  onDeleteTransaction={deleteTransaction}
                  transactions={transactions}
                  month={selectedMonth}
                  year={selectedYear}
                />
                <div className="flex justify-between mt-6">
                  <Button 
                    onClick={prevStep} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back: Setup & People
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={!canProceedFromStep2}
                    className="flex items-center gap-2"
                  >
                    Next: View Summary
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="bg-white/80 backdrop-blur-sm shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Step 3: Summary for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalculationSummary 
                  people={people}
                  transactions={transactions}
                  month={selectedMonth}
                  year={selectedYear}
                />
                <div className="flex justify-between mt-6">
                  <Button 
                    onClick={prevStep} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back: Enter Transactions
                  </Button>
                  <Button 
                    onClick={() => {
                      setPeople([]);
                      setTransactions([]);
                      setCurrentStep(1);
                      // Reset to current month/year
                      setSelectedMonth(currentMonth);
                      setSelectedYear(currentYear);
                    }}
                    className="flex items-center gap-2"
                  >
                    Start New Split
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
