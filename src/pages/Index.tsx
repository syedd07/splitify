import React, { useState, useEffect } from 'react';
import { Plus, Users, Calculator, Download, CreditCard, ArrowLeft, LogIn, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import PersonManager from '@/components/PersonManager';
import TransactionEntry from '@/components/TransactionEntry';
import CalculationSummary from '@/components/CalculationSummary';
import CreditCardDisplay from '@/components/CreditCardDisplay';
import { Person } from '@/types/BillSplitter';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  // Get current date info first
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize with current month and year immediately
  const [selectedMonth, setSelectedMonth] = useState<string>(months[currentMonth]);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [people, setPeople] = useState<Person[]>([]);
  const [currentStep, setCurrentStep] = useState<'setup' | 'transactions' | 'summary'>('setup');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [availableCards, setAvailableCards] = useState<any[]>([]);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Use the real-time transactions hook
  const {
    transactions,
    loading: loadingTransactions,
    addTransaction,
    deleteTransaction
  } = useRealtimeTransactions({
    selectedCard,
    selectedMonth,
    selectedYear,
    user
  });

  // Filter months - only show past months and current month
  const availableMonths = months.slice(0, currentMonth + 1);

  // Only show current year and past 2 years
  const years = Array.from({ length: 3 }, (_, i) => (currentYear - 2 + i).toString());

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        setAuthLoading(true);

        // Load selected card from localStorage
        const storedCard = localStorage.getItem('selectedCard');
        if (storedCard) {
          try {
            setSelectedCard(JSON.parse(storedCard));
          } catch (e) {
            console.error('Error parsing stored card:', e);
            localStorage.removeItem('selectedCard');
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session?.user?.id);
          setUser(session?.user || null);

          if (session?.user) {
            setCardsLoading(true);
            await fetchUserProfile(session.user.id);
            await fetchUserCards(session.user.id);
            setCardsLoading(false);
          } else {
            setUserProfile(null);
            setAvailableCards([]);
            setCardsLoading(false);
          }
          setAuthLoading(false);
        });

        // Check initial session
        const { data: { session } } = await supabase.auth.getSession();
        // console.log('Initial session:', session?.user?.id);
        setUser(session?.user || null);

        if (session?.user) {
          setCardsLoading(true);
          await fetchUserProfile(session.user.id);
          await fetchUserCards(session.user.id);
          setCardsLoading(false);
        }
        setAuthLoading(false);

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error initializing app:', error);
        setAuthLoading(false);
        setCardsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Clear transactions when month/year changes
  useEffect(() => {
    setPeople([]);
    setCurrentStep('setup');
  }, [selectedMonth, selectedYear]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserCards = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setAvailableCards(data || []);
    } catch (error) {
      console.error('Error fetching user cards:', error);
    }
  };

  const handleCardSelect = (cardId: string) => {
    const card = availableCards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(card);
      localStorage.setItem('selectedCard', JSON.stringify(card));
      setShowCardSelector(false);
      toast({
        title: "Card Selected",
        description: `${card.card_name} has been selected for transactions.`,
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setPeople([]);
    setCurrentStep('setup');
    localStorage.removeItem('selectedCard');
    localStorage.removeItem('hasExistingTransactions');
  };

  const handleStartSplitting = () => {
    if (selectedMonth && selectedYear && people.length >= 2) {
      setCurrentStep('transactions');
    }
  };

  // Dummy handlers for backward compatibility - real-time hook handles the actual operations
  const handleAddTransaction = () => {
    // This is handled by the real-time hook now
  };

  const handleDeleteTransaction = () => {
    // This is handled by the real-time hook now
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

  // Mobile Menu Component
  const MobileMenu = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          {user ? (
            <>
              <Button
                onClick={() => navigate('/onboarding')}
                variant="outline"
                className="justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Cards
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="justify-start"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="justify-start"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Splitify!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Credit Ease Divide
              </p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button
                  onClick={() => navigate('/onboarding')}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Cards
                </Button>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <MobileMenu />
        </div>

        {/* Responsive Welcome Message */}
        {user && (
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
              Welcome, {userProfile?.full_name || user.email}!
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Split your credit card bills seamlessly with smart calculations and beautiful reports
            </p>
          </div>
        )}

        {!user && (
          <div className="text-center mb-6 sm:mb-8 px-2">
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Split your credit card bills seamlessly with smart calculations and beautiful reports
            </p>
          </div>
        )}

        {/* Show auth prompt if not logged in */}
        {!user && (
          <div className="text-center mb-6 sm:mb-8 px-2">
            <Card className="max-w-sm sm:max-w-md mx-auto bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Get Started</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Sign up to save your credit cards and split bills with ease
                </p>
                <Button
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 w-full sm:w-auto"
                >
                  Sign Up Now
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rest of the component - only show if user is logged in */}
        {user && (
          <>
            {/* Loading indicator for cards */}
            {cardsLoading && (
              <div className="text-center mb-6 sm:mb-8 px-2">
                <Card className="max-w-sm sm:max-w-md mx-auto bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Loading Cards</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Getting your credit cards ready...
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loading indicator for transactions */}
            {loadingTransactions && currentStep === 'transactions' && (
              <div className="text-center mb-6 sm:mb-8 px-2">
                <Card className="max-w-sm sm:max-w-md mx-auto bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Loading Transactions</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Syncing your data in real-time...
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Only show the main content if cards are loaded */}
            {!cardsLoading && (
              <>
                {/* Responsive Progress Steps */}
                <div className="flex items-center justify-center mb-6 sm:mb-8 px-2">
                  <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
                    <div className={`flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ${currentStep === 'setup' ? 'text-blue-600' : currentStep === 'transactions' || currentStep === 'summary' ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${currentStep === 'setup' ? 'bg-blue-600 text-white' : currentStep === 'transactions' || currentStep === 'summary' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <span className="font-medium text-xs sm:text-sm">Setup</span>
                    </div>
                    <div className={`w-4 sm:w-8 h-1 flex-shrink-0 ${currentStep === 'transactions' || currentStep === 'summary' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    <div className={`flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ${currentStep === 'transactions' ? 'text-blue-600' : currentStep === 'summary' ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${currentStep === 'transactions' ? 'bg-blue-600 text-white' : currentStep === 'summary' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <span className="font-medium text-xs sm:text-sm hidden sm:inline">Add Expenses & Payments</span>
                      <span className="font-medium text-xs sm:text-sm sm:hidden">Expenses</span>
                    </div>
                    <div className={`w-4 sm:w-8 h-1 flex-shrink-0 ${currentStep === 'summary' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    <div className={`flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ${currentStep === 'summary' ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${currentStep === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                        <Calculator className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <span className="font-medium text-xs sm:text-sm">Calculate</span>
                    </div>
                  </div>
                </div>

                {/* Setup Step */}
                {currentStep === 'setup' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Selected Credit Card Display */}
                    {selectedCard && (
                      <Card className="max-w-4xl mx-auto">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                            Selected Credit Card
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg flex-1 w-full sm:w-auto">
                              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm sm:text-base truncate">{selectedCard.card_name}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  **** **** **** {selectedCard.last_four_digits}
                                </p>
                              </div>
                            </div>
                            <Dialog open={showCardSelector} onOpenChange={setShowCardSelector}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full sm:w-auto sm:ml-3">
                                  Change Card
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Select Credit Card</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                  {availableCards.map((card) => (
                                    <CreditCardDisplay
                                      key={card.id}
                                      card={card}
                                      onUpdate={() => fetchUserCards(user.id)}
                                      isSelected={selectedCard?.id === card.id}
                                      onSelect={handleCardSelect}
                                    />
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                            All transactions will be saved to this card
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="max-w-4xl mx-auto">
                      <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                          Credit Card Bill Month
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Month</label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableMonths.map((month) => (
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

                    <PersonManager
                      people={people}
                      setPeople={setPeople}
                      cardOwnerName={userProfile?.full_name || user?.email || 'Card Owner'}
                      userProfile={userProfile}
                      selectedCard={selectedCard}
                      currentUser={user}
                    />

                    <div className="text-center">
                      <Button
                        onClick={handleStartSplitting}
                        disabled={!selectedMonth || !selectedYear || people.length < 2}
                        size={isMobile ? "default" : "lg"}
                        className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 w-full sm:w-auto px-6 sm:px-8"
                      >
                        Start Adding Expenses & Payments
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transaction Entry Step */}
                {currentStep === 'transactions' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Button
                        onClick={handleBackToSetup}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Setup</span>
                        <span className="sm:hidden">Back</span>
                      </Button>
                    </div>

                    <Card className="max-w-6xl mx-auto">
                      <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm sm:text-base">
                          <span>Managing expenses and payments for {selectedMonth} {selectedYear}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Real-time Sync</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6">
                        <TransactionEntry
                          people={people}
                          onAddTransaction={handleAddTransaction}
                          onDeleteTransaction={handleDeleteTransaction}
                          transactions={transactions}
                          month={selectedMonth}
                          year={selectedYear}
                          selectedCard={selectedCard}
                          currentUser={user}
                          userProfile={userProfile}
                          addTransaction={addTransaction}
                          deleteTransaction={deleteTransaction}
                        />
                      </CardContent>
                    </Card>

                    {transactions.length > 0 && (
                      <div className="text-center">
                        <Button
                          onClick={handleProceedToSummary}
                          size={isMobile ? "default" : "lg"}
                          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 w-full sm:w-auto px-6 sm:px-8"
                        >
                          Calculate Split
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Step */}
                {currentStep === 'summary' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Button
                        onClick={handleBackToTransactions}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Expenses</span>
                        <span className="sm:hidden">Back</span>
                      </Button>
                    </div>

                    <div className="max-w-6xl mx-auto">
                      <CalculationSummary
                        people={people}
                        transactions={transactions}
                        month={selectedMonth}
                        year={selectedYear}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
