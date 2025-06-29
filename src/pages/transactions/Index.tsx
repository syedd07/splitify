import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Calculator, Download, CreditCard, ArrowLeft, LogIn, Settings, Menu, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/hooks/useAuth';

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
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [availableCards, setAvailableCards] = useState<any[]>([]);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [stepCompletion, setStepCompletion] = useState({
    setup: false,
    transactions: false,
    summary: false
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Replace existing auth state with useAuth hook
  const { user, userProfile, loading: authLoading } = useAuth();

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

  // Add step persistence
  useEffect(() => {
    // Load step from localStorage on initial render
    const savedStep = localStorage.getItem('currentStep');
    if (savedStep && (savedStep === 'setup' || savedStep === 'transactions' || savedStep === 'summary')) {
      setCurrentStep(savedStep as 'setup' | 'transactions' | 'summary');
    }
  }, []);

  // Save step to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('currentStep', currentStep);
  }, [currentStep]);

  // Initialize with selected card from localStorage
  useEffect(() => {
    if (!selectedCard) {
      const storedCard = localStorage.getItem('selectedCard');
      if (storedCard) {
        try {
          setSelectedCard(JSON.parse(storedCard));
        } catch (e) {
          console.error('Error parsing stored card:', e);
          localStorage.removeItem('selectedCard');
        }
      }
    }
  }, [selectedCard]);

  // Fetch cards only once when user is available
  useEffect(() => {
    let isMounted = true;

    const loadCards = async () => {
      if (!user) return;

      setCardsLoading(true);
      try {
        await fetchUserCards(user.id);
      } finally {
        if (isMounted) {
          setCardsLoading(false);
        }
      }
    };

    loadCards();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Add this to your Index.tsx initialization useEffect
  useEffect(() => {
    const initializeData = async () => {
      // Only show loading state if we're actually going to fetch data
      if (user && !authLoading) {
        setCardsLoading(true);
        try {
          // Load selected card from localStorage
          const storedCard = localStorage.getItem('selectedCard');
          if (storedCard) {
            try {
              const cardData = JSON.parse(storedCard);
              setSelectedCard(cardData);

              // If we're in transactions step but people array is empty, fetch people
              if (currentStep === 'transactions' && people.length === 0 && cardData.id) {
                await fetchPeopleForCard(cardData.id);
              }
            } catch (e) {
              console.error('Error parsing stored card:', e);
              localStorage.removeItem('selectedCard');
              // Redirect to onboarding if card data is invalid
              navigate('/onboarding');
            }
          } else {
            // No card selected but user is logged in - fetch their cards
            await fetchUserCards(user.id);
          }

          // Load people from localStorage
          const savedPeople = localStorage.getItem('splitPeople');
          if (savedPeople && people.length === 0) {
            try {
              setPeople(JSON.parse(savedPeople));
            } catch (e) {
              console.error('Error parsing saved people:', e);
              localStorage.removeItem('splitPeople');
            }
          }
        } finally {
          setCardsLoading(false);
        }
      }
    };

    initializeData();
  }, [user, authLoading]);

  // Update the fetchUserCards function to handle the 406 error:
  const fetchUserCards = async (userId: string) => {
    try {
      // Fetch cards using RLS - let the policies handle access control
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform cards to include role information
      const cardsWithRoles = await Promise.all((data || []).map(async (card) => {
        const isOwner = card.user_id === userId;

        let role = 'guest';
        if (isOwner) {
          role = 'owner';
        } else {
          // Check if user is a card member - handle 406 error gracefully
          try {
            const { data: memberData, error: memberError } = await supabase
              .from('card_members')
              .select('role')
              .eq('credit_card_id', card.id)
              .eq('user_id', userId)
              .maybeSingle(); // Use maybeSingle instead of single to handle no results

            if (memberError) {
              console.warn('Error checking card membership:', memberError);
              // Continue to check shared_emails if member check fails
            } else if (memberData) {
              role = memberData.role || 'member';
            }
          } catch (memberCheckError) {
            console.warn('Failed to check card membership:', memberCheckError);
            // Continue to shared_emails check
          }

          // If no membership found, check shared_emails
          if (role === 'guest') {
            try {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();

              if (userProfile && card.shared_emails && Array.isArray(card.shared_emails)) {
                const isInSharedEmails = card.shared_emails.some(email =>
                  String(email).toLowerCase() === String(userProfile.email).toLowerCase()
                );
                if (isInSharedEmails) {
                  role = 'member';
                }
              }
            } catch (profileError) {
              console.warn('Error checking user profile for shared emails:', profileError);
            }
          }
        }

        return {
          ...card,
          role
        };
      }));

      // Only return cards where user has access (not guest)
      const accessibleCards = cardsWithRoles.filter(card => card.role !== 'guest');
      setAvailableCards(accessibleCards);
    } catch (error) {
      console.error('Error fetching user cards:', error);
      toast({
        title: "Error",
        description: "Failed to load your cards. Please try again.",
        variant: "destructive",
      });
      setAvailableCards([]);
    }
  };

  // Keep your existing fetchPeopleForCard function in Index.tsx instead of the hook:
  const fetchPeopleForCard = useCallback(async (cardId: string) => {
    try {
      const peopleSet = new Set();
      const newPeople: Person[] = [];

      // Get card owner first
      const { data: cardData, error: cardError } = await supabase
        .from('credit_cards')
        .select('user_id, shared_emails')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      if (cardData?.user_id) {
        // Get profile data separately
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', cardData.user_id)
          .single();

        if (!profileError && profileData) {
          // Add card owner
          newPeople.push({
            id: cardData.user_id,
            name: profileData.full_name || profileData.email,
            isCardOwner: true
          });
          peopleSet.add(cardData.user_id);
        }
      }

      // Get card members separately
      const { data: members, error: membersError } = await supabase
        .from('card_members')
        .select('user_id')
        .eq('credit_card_id', cardId);

      if (membersError) throw membersError;

      // Get profiles for all member user_ids
      if (members && members.length > 0) {
        const memberUserIds = members.map(m => m.user_id);

        const { data: memberProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', memberUserIds);

        if (profilesError) throw profilesError;

        if (memberProfiles) {
          memberProfiles.forEach(profile => {
            if (!peopleSet.has(profile.id)) {
              newPeople.push({
                id: profile.id,
                name: profile.full_name || profile.email,
                isCardOwner: false
              });
              peopleSet.add(profile.id);
            }
          });
        }
      }

      // Handle shared_emails (for backward compatibility)
      if (cardData?.shared_emails && Array.isArray(cardData.shared_emails)) {
        for (const email of cardData.shared_emails) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('email', String(email).toLowerCase())
            .single();

          if (userProfile && !peopleSet.has(userProfile.id)) {
            newPeople.push({
              id: userProfile.id,
              name: userProfile.full_name || userProfile.email,
              isCardOwner: false
            });
            peopleSet.add(userProfile.id);
          }
        }
      }

      setPeople(newPeople);
      return newPeople;
    } catch (error) {
      console.error('Error fetching people for card:', error);
      toast({
        title: "Error",
        description: "Failed to load people for this card.",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

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
    setPeople([]);
    setCurrentStep('setup');
    localStorage.removeItem('selectedCard');
    localStorage.removeItem('hasExistingTransactions');
  };

  const handleStartSplitting = () => {
    if (selectedMonth && selectedYear && people.length >= 2) {
      // Save people data to localStorage to preserve it across refreshes
      localStorage.setItem('splitPeople', JSON.stringify(people));
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

  const handleRefresh = () => {
    window.location.reload();
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
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="justify-start"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582M20 20v-5h-.581M5.07 19A9 9 0 1 1 12 21a9 9 0 0 1-6.93-2.93"></path></svg>
            Refresh
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Add this to your Index.tsx component
  const resetStates = () => {
    setCardsLoading(false);
    // Reset other loading states as needed
  };

  // Use the useEffect hook to reset states when the component unmounts
  useEffect(() => {
    return () => {
      resetStates();
    };
  }, []);

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

  // Update step completion tracking
  useEffect(() => {
    const completion = {
      setup: selectedCard && selectedMonth && selectedYear && people.length >= 2,
      transactions: transactions.length > 0,
      summary: currentStep === 'summary'
    };
    setStepCompletion(completion);
    localStorage.setItem('stepCompletion', JSON.stringify(completion));
  }, [selectedCard, selectedMonth, selectedYear, people.length, transactions.length, currentStep]);

  // Enhanced progress indicator
  const ProgressSteps = () => (
    <div className="flex items-center justify-center mb-6 sm:mb-8 px-2">
      <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
        {/* Step 1: Setup */}
        <div className={`flex items-center space-x-1 sm:space-x-2 flex-shrink-0 transition-all duration-300 ${currentStep === 'setup'
            ? 'text-blue-600 scale-105'
            : stepCompletion.setup
              ? 'text-green-600'
              : 'text-gray-400'
          }`}>
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep === 'setup'
              ? 'bg-blue-600 text-white shadow-lg'
              : stepCompletion.setup
                ? 'bg-green-600 text-white'
                : 'bg-gray-200'
            }`}>
            {stepCompletion.setup ? (
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </div>
          <span className="font-medium text-xs sm:text-sm">Setup</span>
           {/* {stepCompletion.setup && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )} */}
        </div>

        {/* Progress Line 1 */}
        <div className={`w-4 sm:w-8 h-1 flex-shrink-0 transition-all duration-500 ${stepCompletion.setup ? 'bg-green-600' : 'bg-gray-200'
          }`}></div>

        {/* Step 2: Transactions */}
        <div className={`flex items-center space-x-1 sm:space-x-2 flex-shrink-0 transition-all duration-300 ${currentStep === 'transactions'
            ? 'text-blue-600 scale-105'
            : stepCompletion.transactions
              ? 'text-green-600'
              : 'text-gray-400'
          }`}>
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep === 'transactions'
              ? 'bg-blue-600 text-white shadow-lg'
              : stepCompletion.transactions
                ? 'bg-green-600 text-white'
                : 'bg-gray-200'
            }`}>
            {stepCompletion.transactions ? (
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </div>
          <span className="font-medium text-xs sm:text-sm hidden sm:inline">Add Expenses & Payments</span>
          <span className="font-medium text-xs sm:text-sm sm:hidden">Expenses</span>
          {currentStep === 'transactions' && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
        </div>

        {/* Progress Line 2 */}
        <div className={`w-4 sm:w-8 h-1 flex-shrink-0 transition-all duration-500 ${stepCompletion.transactions ? 'bg-green-600' : 'bg-gray-200'
          }`}></div>

        {/* Step 3: Calculate */}
        <div className={`flex items-center space-x-1 sm:space-x-2 flex-shrink-0 transition-all duration-300 ${currentStep === 'summary' ? 'text-blue-600 scale-105' : 'text-gray-400'
          }`}>
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep === 'summary'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200'
            }`}>
            <Calculator className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <span className="font-medium text-xs sm:text-sm">Calculate</span>
        </div>
      </div>
    </div>
  );

  // Add quick action buttons and smart navigation

  // Add floating action button for quick expense entry
  const QuickActionFAB = () => (
    <div className="fixed bottom-6 right-6 z-50">
      {currentStep === 'transactions' && (
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          onClick={() => {
            // Auto-focus on amount input
            setTimeout(() => {
              const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
              amountInput?.focus();
              amountInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </div>
  );

  // Add smart navigation suggestions
  const NavigationSuggestions = () => (
    <div className="max-w-4xl mx-auto mb-6">
      {currentStep === 'setup' && stepCompletion.setup && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">Setup complete!</span>
                <span className="text-sm text-muted-foreground">Ready to add transactions</span>
              </div>
              <Button
                onClick={() => setCurrentStep('transactions')}
                size="sm"
                className="ml-4"
              >
                Continue →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'transactions' && transactions.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{transactions.length} transactions added</span>
                <span className="text-sm text-muted-foreground">Ready to calculate splits</span>
              </div>
              <Button
                onClick={() => setCurrentStep('summary')}
                size="sm"
                className="ml-4"
              >
                Calculate →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
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
          <div className="md:hidden ml-auto">
            <MobileMenu />
          </div>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
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
                <ProgressSteps />

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
                                {cardsLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                    <p>Loading your cards...</p>
                                  </div>
                                ) : availableCards.length === 0 ? (
                                  <div className="text-center py-8">
                                    <p className="mb-4">No credit cards found.</p>
                                    <Button onClick={() => navigate('/onboarding')}>
                                      Add a Card
                                    </Button>
                                  </div>
                                ) : (
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
                                )}
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
