import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Plus, CheckCircle, Loader2, LogOut, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import CreditCardForm from '@/components/CreditCardForm';
import CreditCardDisplay from '@/components/CreditCardDisplay';

interface CreditCardData {
  id: string;
  card_name: string;
  last_four_digits: string;
  issuing_bank?: string;
  card_type?: string;
  is_primary: boolean;
  bin_info?: any;
}

const Onboarding = () => {
  const [user, setUser] = useState<any>(null);
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      await fetchCreditCards();
      setLoading(false);
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

  const fetchCreditCards = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true }); // First card should be primary

      if (error) throw error;
      
      // Mark only the first card as primary
      const updatedCards = (data || []).map((card, index) => ({
        ...card,
        is_primary: index === 0
      }));
      
      setCreditCards(updatedCards);
      
      // Auto-select the first (primary) card
      if (updatedCards.length > 0) {
        setSelectedCardId(updatedCards[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch credit cards",
        variant: "destructive",
      });
    }
  };

  const handleCardAdded = (newCard: CreditCardData) => {
    // If this is the first card, make it primary
    const isFirstCard = creditCards.length === 0;
    const cardWithPrimary = { ...newCard, is_primary: isFirstCard };
    
    setCreditCards(prev => [cardWithPrimary, ...prev]);
    setShowAddCard(false);
    
    // Auto-select the new card if it's the first one
    if (isFirstCard) {
      setSelectedCardId(cardWithPrimary.id);
    }
    
    if (creditCards.length === 0) {
      toast({
        title: "Success!",
        description: "Your first credit card has been added. You can now start splitting bills!",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleStartSplitting = () => {
    if (!selectedCardId) {
      toast({
        title: "Please select a card",
        description: "Choose a credit card to continue with bill splitting",
        variant: "destructive",
      });
      return;
    }
    
    const selectedCard = creditCards.find(card => card.id === selectedCardId);
    if (selectedCard) {
      // Store selected card info in localStorage or navigate with state
      localStorage.setItem('selectedCard', JSON.stringify(selectedCard));
      navigate('/');
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Production layout for users with existing cards
  if (creditCards.length > 0 && !showAddCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                My Credit Cards
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* User Welcome */}
          {user && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Welcome back, {user.user_metadata?.full_name || user.email}!
              </h2>
              <p className="text-muted-foreground">
                Select a credit card to start splitting bills with ease
              </p>
            </div>
          )}

          {/* Cards Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Add New Card Button */}
              <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="w-full flex flex-col items-center gap-4 text-blue-600 hover:text-blue-700"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold">Add New Card</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add another credit card
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>

              {/* Existing Credit Cards */}
              {creditCards.map((card) => (
                <CreditCardDisplay
                  key={card.id}
                  card={card}
                  onUpdate={fetchCreditCards}
                  isSelected={selectedCardId === card.id}
                  onSelect={handleCardSelect}
                />
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 text-center">
              <Button
                onClick={handleStartSplitting}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-3 text-lg"
                disabled={!selectedCardId}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Start Splitting
              </Button>
              {!selectedCardId && (
                <p className="text-sm text-muted-foreground mt-2">
                  Please select a credit card to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original onboarding flow for new users or when adding cards
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {creditCards.length > 0 ? 'Add New Credit Card' : 'Welcome to Credit Ease Divide'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {creditCards.length > 0 && (
              <Button onClick={() => setShowAddCard(false)} variant="outline" size="sm">
                Back to Cards
              </Button>
            )}
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Welcome Section */}
        {user && creditCards.length === 0 && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Hello, {user.user_metadata?.full_name || user.email}!
            </h2>
            <p className="text-lg text-muted-foreground">
              Let's set up your credit cards to start splitting bills seamlessly
            </p>
          </div>
        )}

        {/* Credit Cards Section */}
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6">
            {/* Add Credit Card Button or Form */}
            {!showAddCard && creditCards.length === 0 && (
              <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="w-full flex flex-col items-center gap-4 text-blue-600 hover:text-blue-700"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Plus className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-semibold">Add Your First Credit Card</h3>
                      <p className="text-muted-foreground mt-2">
                        Add your credit card details to start splitting bills with others
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Credit Card Form */}
            {showAddCard && (
              <CreditCardForm 
                onCardAdded={handleCardAdded}
                onCancel={() => setShowAddCard(false)}
              />
            )}

            {/* Get Started Button for first-time users */}
            {creditCards.length > 0 && !showAddCard && (
              <div className="text-center mt-8">
                <Button
                  onClick={handleStartSplitting}
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-3 text-lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Start Splitting Bills
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
