import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Plus, CheckCircle, Loader2, LogOut, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  user_id?: string;
  role?: string;
}

const Onboarding = () => {
  const [user, setUser] = useState<any>(null);
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingTransactions, setCheckingTransactions] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      console.log('Starting auth check...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            navigate('/auth');
          }
          return;
        }
        
        if (!session?.user) {
          console.log('No session found, redirecting to auth');
          if (isMounted) {
            navigate('/auth');
          }
          return;
        }
        
        console.log('Session found:', session.user.id);
        if (isMounted) {
          setUser(session.user);
        }
        
        // Check if this is an invitation acceptance
        const isInvite = searchParams.get('invite') === 'true';
        const cardId = searchParams.get('cardId');
        
        if (isInvite && cardId && isMounted) {
          console.log('Processing invitation for card:', cardId);
          setProcessingInvitation(true);
          await handleInvitationAcceptance(cardId, session.user);
          if (isMounted) {
            setProcessingInvitation(false);
          }
        }
        
        // Fetch credit cards after processing invitation
        if (isMounted) {
          await fetchCreditCards(session.user);
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        if (isMounted) {
          setErrorMessage('Failed to authenticate user');
          toast({
            title: "Error",
            description: "Failed to authenticate user",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (!session?.user) {
        if (isMounted) {
          navigate('/auth');
        }
      } else if (isMounted) {
        setUser(session.user);
        await fetchCreditCards(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  const handleInvitationAcceptance = async (cardId: string, currentUser: any) => {
    try {
      console.log('Processing invitation for card:', cardId, 'user:', currentUser.email);
      
      // Check if user already has a profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      }

      // If no profile exists, create one
      if (!existingProfile) {
        console.log('Creating profile for invited user');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || ''
          });

        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
        }
      }
      
      // Find the pending invitation for this user and card
      const { data: invitation, error: inviteError } = await supabase
        .from('card_invitations')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('invited_email', currentUser.email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (inviteError) {
        console.error('Error finding invitation:', inviteError);
        return;
      }

      if (invitation) {
        console.log('Found invitation:', invitation.id);
        
        // Check if user is already a member of this card
        const { data: existingMember } = await supabase
          .from('card_members')
          .select('*')
          .eq('credit_card_id', cardId)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (!existingMember) {
          // Add user as a member of the card
          const { error: memberError } = await supabase
            .from('card_members')
            .insert({
              credit_card_id: cardId,
              user_id: currentUser.id,
              role: 'member'
            });

          if (memberError) {
            console.error('Error adding card member:', memberError);
            toast({
              title: "Error",
              description: "Failed to add you as a card member",
              variant: "destructive",
            });
            return;
          }

          console.log('User added as card member');
        }

        // Update invitation status to accepted
        const { error: updateError } = await supabase
          .from('card_invitations')
          .update({ 
            status: 'accepted',
            invited_user_id: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        if (updateError) {
          console.error('Error updating invitation:', updateError);
        } else {
          console.log('Invitation status updated to accepted');
        }

        // Get card name for the toast
        const { data: cardData } = await supabase
          .from('credit_cards')
          .select('card_name')
          .eq('id', cardId)
          .single();

        toast({
          title: "Invitation accepted!",
          description: `You now have access to ${cardData?.card_name || 'the credit card'}`,
        });

        // Clear the URL parameters
        navigate('/onboarding', { replace: true });
      } else {
        console.log('No pending invitation found for this user and card');
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      toast({
        title: "Error",
        description: "Failed to process invitation",
        variant: "destructive",
      });
    }
  };

  const fetchCreditCards = async (currentUser?: any) => {
    try {
      const userToUse = currentUser || user;
      if (!userToUse?.id) {
        console.log('No user available for fetching credit cards');
        return;
      }

      console.log('Fetching credit cards for user:', userToUse.id);

      // Fetch owned cards
      const { data: ownedCards, error: ownedError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userToUse.id)
        .order('created_at', { ascending: true });

      if (ownedError) {
        console.error('Error fetching owned cards:', ownedError);
        throw ownedError;
      }
      
      console.log('Owned cards:', ownedCards || []);

      // Fetch shared cards through memberships - using a simpler query structure
      const { data: membershipData, error: memberError } = await supabase
        .from('card_members')
        .select('role, credit_card_id')
        .eq('user_id', userToUse.id);

      if (memberError) {
        console.error('Error fetching member cards:', memberError);
        throw memberError;
      }
      
      console.log('Member cards data:', membershipData || []);

      // Fetch the actual card details for memberships
      let sharedCards: any[] = [];
      if (membershipData && membershipData.length > 0) {
        const cardIds = membershipData.map(m => m.credit_card_id);
        
        const { data: sharedCardDetails, error: sharedError } = await supabase
          .from('credit_cards')
          .select('*')
          .in('id', cardIds);

        if (sharedError) {
          console.error('Error fetching shared card details:', sharedError);
        } else {
          // Combine card details with roles
          sharedCards = sharedCardDetails?.map(card => {
            const membership = membershipData.find(m => m.credit_card_id === card.id);
            return {
              ...card,
              role: membership?.role || 'member'
            };
          }) || [];
        }
      }

      console.log('Shared cards:', sharedCards);

      // Combine owned and shared cards
      const allCards: CreditCardData[] = [];
      
      // Add owned cards with owner role
      if (ownedCards && ownedCards.length > 0) {
        ownedCards.forEach((card, index) => {
          allCards.push({
            ...card,
            is_primary: index === 0,
            role: 'owner'
          });
        });
      }

      // Add shared cards (excluding ones we already own)
      if (sharedCards && sharedCards.length > 0) {
        sharedCards.forEach((card) => {
          // Don't add cards we already own
          const isAlreadyOwned = ownedCards?.some(owned => owned.id === card.id);
          if (!isAlreadyOwned) {
            allCards.push({
              ...card,
              is_primary: false,
              role: card.role
            });
          }
        });
      }

      console.log('All cards combined:', allCards);
      setCreditCards(allCards);
      
      // Set first card as selected if none selected and we have cards
      if (allCards.length > 0 && !selectedCardId) {
        setSelectedCardId(allCards[0].id);
      }

      // Clear any error messages on successful fetch
      setErrorMessage('');
    } catch (error: any) {
      console.error('Error fetching credit cards:', error);
      const errorMsg = error.message || 'Failed to fetch credit cards';
      setErrorMessage(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
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
    const isFirstCard = creditCards.length === 0;
    const cardWithPrimary = { ...newCard, is_primary: isFirstCard, role: 'owner' };
    
    setCreditCards(prev => [cardWithPrimary, ...prev]);
    setShowAddCard(false);
    
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

  const handleStartSplitting = async () => {
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
      localStorage.setItem('selectedCard', JSON.stringify(selectedCard));
      
      // Check for existing transactions
      const hasTransactions = await checkForExistingTransactions(selectedCardId);
      
      if (hasTransactions) {
        // Store a flag to indicate we should go to step 2
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

  if (loading || processingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {processingInvitation ? 'Processing invitation...' : 'Loading...'}
          </p>
          {errorMessage && (
            <p className="text-red-600 mt-2 text-sm">{errorMessage}</p>
          )}
        </div>
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

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{errorMessage}</p>
              <Button 
                onClick={() => fetchCreditCards()} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Cards Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Add New Card Button (only show if user has owned cards or no cards) */}
              {(creditCards.some(card => card.role === 'owner') || creditCards.length === 0) && (
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
              )}

              {/* Existing Credit Cards */}
              {creditCards.map((card) => (
                <CreditCardDisplay
                  key={card.id}
                  card={card}
                  onUpdate={() => fetchCreditCards()}
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

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-4xl mx-auto">
            <p className="text-red-700">{errorMessage}</p>
            <Button 
              onClick={() => fetchCreditCards()} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Retry
            </Button>
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
