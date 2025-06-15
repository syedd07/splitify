import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, CheckCircle, Loader2, LogOut, User, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import CreditCardForm from '@/components/CreditCardForm';
import CreditCardDisplay from '@/components/CreditCardDisplay';
import InviteUserForm from '@/components/InviteUserForm';

interface CreditCardData {
  id: string;
  card_name: string;
  last_four_digits: string;
  issuing_bank?: string;
  card_type?: string;
  is_primary: boolean;
  user_id?: string;
  bin_info?: any;
}

interface InvitedCard {
  id: string;
  card_name: string;
  last_four_digits: string;
  issuing_bank?: string;
  card_type?: string;
  is_primary: boolean;
  user_id?: string;
  role?: string;
}

const Onboarding = () => {
  const [user, setUser] = useState<any>(null);
  const [ownedCards, setOwnedCards] = useState<CreditCardData[]>([]);
  const [invitedCards, setInvitedCards] = useState<InvitedCard[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingTransactions, setCheckingTransactions] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
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
      await fetchCards();
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

  const fetchCards = async () => {
    try {
      console.log('Starting fetchCards...');
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting current user:', userError);
        throw userError;
      }
      
      if (!currentUser) {
        console.error('No current user found');
        throw new Error('No authenticated user');
      }
      
      console.log('Current user ID:', currentUser.id);

      // Fetch owned cards with detailed logging
      console.log('Fetching owned cards...');
      const { data: owned, error: ownedError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      console.log('Owned cards query result:', { owned, ownedError });

      if (ownedError) {
        console.error('Error fetching owned cards:', ownedError);
        throw ownedError;
      }

      // Fetch invited cards through card_members with detailed logging
      console.log('Fetching invited cards...');
      const { data: invited, error: invitedError } = await supabase
        .from('card_members')
        .select(`
          role,
          credit_cards!inner(
            id,
            card_name,
            last_four_digits,
            issuing_bank,
            card_type,
            is_primary,
            user_id
          )
        `)
        .eq('user_id', currentUser.id)
        .neq('role', 'owner');

      console.log('Invited cards query result:', { invited, invitedError });

      if (invitedError) {
        console.error('Error fetching invited cards:', invitedError);
        throw invitedError;
      }

      const ownedCardsData = (owned || []).map((card, index) => ({
        ...card,
        is_primary: index === 0
      }));

      const invitedCardsData = (invited || []).map((item: any) => ({
        ...item.credit_cards,
        role: item.role
      }));

      console.log('Final card data:', { ownedCardsData, invitedCardsData });

      setOwnedCards(ownedCardsData);
      setInvitedCards(invitedCardsData);

      const allCards = [...ownedCardsData, ...invitedCardsData];
      if (allCards.length > 0) {
        setSelectedCardId(allCards[0].id);
      }
      
      console.log('fetchCards completed successfully');
    } catch (error: any) {
      console.error('Error in fetchCards:', error);
      toast({
        title: "Error",
        description: `Failed to fetch credit cards: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const checkForExistingTransactions = async (cardId: string) => {
    try {
      setCheckingTransactions(true);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('credit_card_id', cardId)
        .limit(1);

      if (error) throw error;

      return transactions && transactions.length > 0;
    } catch (error) {
      console.error('Error checking transactions:', error);
      return false;
    } finally {
      setCheckingTransactions(false);
    }
  };

  const handleCardAdded = (newCard: CreditCardData) => {
    const isFirstCard = ownedCards.length === 0;
    const cardWithPrimary = { ...newCard, is_primary: isFirstCard };
    
    setOwnedCards(prev => [cardWithPrimary, ...prev]);
    setShowAddCard(false);
    
    if (isFirstCard) {
      setSelectedCardId(cardWithPrimary.id);
    }
    
    if (ownedCards.length === 0) {
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

  const handleStartSplitting = async () => {
    if (!selectedCardId) {
      toast({
        title: "Please select a card",
        description: "Choose a credit card to continue with bill splitting",
        variant: "destructive",
      });
      return;
    }
    
    const allCards = [...ownedCards, ...invitedCards];
    const selectedCard = allCards.find(card => card.id === selectedCardId);
    if (selectedCard) {
      localStorage.setItem('selectedCard', JSON.stringify(selectedCard));
      
      // Check for existing transactions
      const hasTransactions = await checkForExistingTransactions(selectedCardId);
      
      if (hasTransactions) {
        localStorage.setItem('hasExistingTransactions', 'true');
        toast({
          title: "Previous transactions found",
          description: "Loading your existing transactions...",
        });
      } else {
        localStorage.removeItem('hasExistingTransactions');
      }
      
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

  const totalCards = ownedCards.length + invitedCards.length;

  // Production layout for users with existing cards
  if (totalCards > 0 && !showAddCard) {
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
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 border-0 bg-transparent shadow-none">
                  <InviteUserForm 
                    onClose={() => setShowInviteDialog(false)}
                    onInviteSent={() => {
                      toast({
                        title: "Success!",
                        description: "Invitation sent successfully!",
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
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

          {/* Owned Cards Section */}
          {ownedCards.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                My Cards ({ownedCards.length})
              </h3>
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

                {/* Owned Credit Cards */}
                {ownedCards.map((card) => (
                  <CreditCardDisplay
                    key={card.id}
                    card={card}
                    onUpdate={fetchCards}
                    isSelected={selectedCardId === card.id}
                    onSelect={handleCardSelect}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Invited Cards Section */}
          {invitedCards.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Shared Cards ({invitedCards.length})
              </h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {invitedCards.map((card) => (
                  <CreditCardDisplay
                    key={card.id}
                    card={card}
                    onUpdate={fetchCards}
                    isSelected={selectedCardId === card.id}
                    onSelect={handleCardSelect}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 text-center">
            <Button
              onClick={handleStartSplitting}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-3 text-lg"
              disabled={!selectedCardId || checkingTransactions}
            >
              {checkingTransactions ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking Transactions...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Start Splitting
                </>
              )}
            </Button>
            {!selectedCardId && !checkingTransactions && (
              <p className="text-sm text-muted-foreground mt-2">
                Please select a credit card to continue
              </p>
            )}
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
              {ownedCards.length > 0 ? 'Add New Credit Card' : 'Welcome to Credit Ease Divide'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {ownedCards.length > 0 && (
              <Button onClick={() => setShowAddCard(false)} variant="outline" size="sm">
                Back to Cards
              </Button>
            )}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0 border-0 bg-transparent shadow-none">
                <InviteUserForm 
                  onClose={() => setShowInviteDialog(false)}
                  onInviteSent={() => {
                    toast({
                      title: "Success!",
                      description: "Invitation sent successfully!",
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Welcome Section */}
        {user && ownedCards.length === 0 && invitedCards.length === 0 && (
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
            {!showAddCard && ownedCards.length === 0 && invitedCards.length === 0 && (
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
            {totalCards > 0 && !showAddCard && (
              <div className="text-center mt-8">
                <Button
                  onClick={handleStartSplitting}
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-3 text-lg"
                  disabled={checkingTransactions}
                >
                  {checkingTransactions ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Checking Transactions...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Start Splitting Bills
                    </>
                  )}
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
