import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Calculator, CreditCard, Users, DollarSign, PieChart, LogOut, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import PersonManager from '@/components/PersonManager';
import TransactionEntry from '@/components/TransactionEntry';
import CalculationSummary from '@/components/CalculationSummary';
import type { Person, Transaction, CalculationResult } from '@/types/BillSplitter';

const Index = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [calculationResults, setCalculationResults] = useState<CalculationResult[]>([]);
  const [user, setUser] = useState<any>(null);
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

  const calculateBalances = () => {
    // Aggregate amounts paid by each person
    const personPayments: { [personId: string]: number } = {};
    people.forEach(person => personPayments[person.id] = 0); // Initialize all to 0

    transactions.forEach(transaction => {
      personPayments[transaction.paidBy] += transaction.amount;
    });

    // Calculate each person's share
    const totalBill = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const individualShare = totalBill / people.length;

    // Determine who owes whom
    const newCalculationResults: CalculationResult[] = [];
    people.forEach(person => {
      const amountOwed = personPayments[person.id] - individualShare;
      newCalculationResults.push({ personId: person.id, amountOwed });
    });

    setCalculationResults(newCalculationResults);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

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

        {/* Core App Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Person Management */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Manage People
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PersonManager people={people} addPerson={addPerson} deletePerson={deletePerson} />
            </CardContent>
          </Card>

          {/* Transaction Entry */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Enter Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionEntry people={people} addTransaction={addTransaction} />
            </CardContent>
          </Card>

          {/* Calculation Summary */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Calculation Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CalculationSummary calculationResults={calculationResults} people={people} calculateBalances={calculateBalances} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
