
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Calculator, CreditCard, Users, DollarSign, PieChart, LogOut, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import PersonManager from '@/components/PersonManager';
import TransactionEntry from '@/components/TransactionEntry';
import CalculationSummary from '@/components/CalculationSummary';
import type { Person, Transaction } from '@/types/BillSplitter';

const Index = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const addPerson = (newPerson: Person) => {
    setPeople([...people, newPerson]);
  };

  const deletePerson = (id: string) => {
    setPeople(people.filter(person => person.id !== id));
  };

  const addTransaction = (newTransaction: Transaction) => {
    setTransactions([...transactions, newTransaction]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(transaction => transaction.id !== id));
  };

  const handleSignOut = async () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-600" />
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
                  {step === 1 && 'Add People'}
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
                  Step 1: Manage People
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                  Step 2: Enter Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionEntry 
                  people={people} 
                  onAddTransaction={addTransaction}
                  onDeleteTransaction={deleteTransaction}
                  transactions={transactions}
                  month="12"
                  year="2024"
                />
                <div className="flex justify-between mt-6">
                  <Button 
                    onClick={prevStep} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back: Manage People
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
                  Step 3: Calculation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalculationSummary 
                  people={people}
                  transactions={transactions}
                  month="12"
                  year="2024"
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
