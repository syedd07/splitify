import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Plus, CheckCircle, Loader2, LogOut, User, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import CreditCardForm from '@/components/CreditCardForm';
import CreditCardDisplay from '@/components/CreditCardDisplay';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { requestNotificationPermission, saveUserPushToken } from '@/lib/notifications';


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
  shared_emails?: string[];
}

const Onboarding = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loading, setLoading] = useState(false); // Only for card-specific operations
  const [checkingTransactions, setCheckingTransactions] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [authInitialized, setAuthInitialized] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Invitation processing state
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string>('');
  

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        // Skip auth check since we're using useAuth and ProtectedRoute
        
        // Check if this is an invitation acceptance
        const isInvite = searchParams.get('invite') === 'true';
        const cardId = searchParams.get('cardId');
        
        if (isInvite && cardId && user) {
          setProcessingInvitation(true);
          await handleInvitationAcceptance(cardId, user);
          if (isMounted) {
            setProcessingInvitation(false);
          }
        }
        
        // Fetch credit cards if user exists
        if (user) {
          await fetchCreditCards(user);
        }
      } catch (error) {
        console.error('Error in initialization:', error);
        if (isMounted) {
          setErrorMessage('Failed to initialize');
          toast({
            title: "Error",
            description: "Failed to initialize",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Only initialize if not in auth loading state
    if (!authLoading) {
      initialize();
    }

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams, user, authLoading]);
  
  const handleInvitationAcceptance = async (cardId: string, currentUser: any) => {
    try {
     // console.log('Processing invitation for card:', cardId, 'user:', currentUser.email);
      
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
       // console.log('Creating profile for invited user');
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
      //  console.log('Found invitation:', invitation.id);
        
        // Get the card and add the user's email to shared_emails
        const { data: cardData, error: cardError } = await supabase
          .from('credit_cards')
          .select('shared_emails, card_name')
          .eq('id', cardId)
          .single();

        if (cardError) {
          console.error('Error fetching card:', cardError);
          return;
        }

        // Safely handle shared_emails as Json type with proper type checking
        let currentSharedEmails: string[] = [];
        if (cardData.shared_emails) {
          try {
            if (Array.isArray(cardData.shared_emails)) {
              currentSharedEmails = cardData.shared_emails.filter((email): email is string => 
                typeof email === 'string'
              );
            } else if (typeof cardData.shared_emails === 'string') {
              const parsed = JSON.parse(cardData.shared_emails);
              if (Array.isArray(parsed)) {
                currentSharedEmails = parsed.filter((email): email is string => 
                  typeof email === 'string'
                );
              }
            }
          } catch (e) {
            console.error('Error parsing shared_emails:', e);
            currentSharedEmails = [];
          }
        }

        const userEmail = currentUser.email.toLowerCase();
        
        if (!currentSharedEmails.includes(userEmail)) {
          const updatedSharedEmails = [...currentSharedEmails, userEmail];
          
          const { error: updateError } = await supabase
            .from('credit_cards')
            .update({ shared_emails: updatedSharedEmails })
            .eq('id', cardId);

          if (updateError) {
            console.error('Error updating shared emails:', updateError);
            toast({
              title: "Error",
              description: "Failed to add you to the card",
              variant: "destructive",
            });
            return;
          }

        //  console.log('User email added to card shared_emails');
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
        //  console.log('Invitation status updated to accepted');
        }

        toast({
          title: "Invitation accepted!",
          description: `You now have access to ${cardData?.card_name || 'the credit card'}`,
        });

        // Clear the URL parameters
        navigate('/onboarding', { replace: true });
      } else {
      //  console.log('No pending invitation found for this user and card');
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

  // Update the fetchCreditCards function to use useCallback
  const fetchCreditCards = useCallback(async (currentUser?: any) => {
    try {
      const userToUse = currentUser || user;
      if (!userToUse?.id) {
        return;
      }

    //  console.log('Current user email:', userToUse.email);
    //  console.log('Current user ID:', userToUse.id);

      // Fetch all cards with their membership data
      const { data: allCards, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          card_members(user_id, role)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform cards and determine roles
      const cardsWithRoles = (allCards || []).map((card, index) => {
        const isOwner = card.user_id === userToUse.id;
        
        // Check if user is a member from card_members table (prioritized approach)
        const membershipData = card.card_members?.find(
          (member: any) => member.user_id === userToUse.id
        );
        
        // Handle shared_emails as fallback for backward compatibility
        let sharedEmails: string[] = [];
        if (card.shared_emails) {
          try {
            if (Array.isArray(card.shared_emails)) {
              sharedEmails = card.shared_emails.filter((email): email is string => 
                typeof email === 'string'
              );
            } else if (typeof card.shared_emails === 'string') {
              const parsed = JSON.parse(card.shared_emails);
              if (Array.isArray(parsed)) {
                sharedEmails = parsed.filter((email): email is string => 
                  typeof email === 'string'
                );
              }
            }
          } catch (e) {
            console.error('Error parsing shared_emails:', e);
            sharedEmails = [];
          }
        }

        // Check if user is shared via email (fallback approach)
        const isSharedViaEmail = !isOwner && 
          sharedEmails.some(email => 
            email.toLowerCase() === userToUse.email?.toLowerCase()
          );

        // Determine final role with priority: card_members > shared_emails > guest
        let finalRole: string;
        if (isOwner) {
          finalRole = 'owner';
        } else if (membershipData) {
          // User found in card_members table (prioritized approach)
          finalRole = membershipData.role || 'member';
        } else if (isSharedViaEmail) {
          // User found in shared_emails (fallback approach)
          finalRole = 'member';
        } else {
          finalRole = 'guest';
        }

        // DEBUG: Log the role determination process
        // console.log(`Card: ${card.card_name}`);
        // console.log(`  - isOwner: ${isOwner}`);
        // console.log(`  - membershipData:`, membershipData);
        // console.log(`  - isSharedViaEmail: ${isSharedViaEmail}`);
        // console.log(`  - finalRole: ${finalRole}`);

        return {
          ...card,
          shared_emails: sharedEmails,
          is_primary: isOwner && index === 0,
          role: finalRole,
          // Remove the card_members array from the final object to keep it clean
          card_members: undefined
        };
      });

    setCreditCards(cardsWithRoles);
    
    // Set first card as selected if none selected and we have cards
    if (cardsWithRoles.length > 0 && !selectedCardId) {
      setSelectedCardId(cardsWithRoles[0].id);
    }

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
  }, [user, selectedCardId, toast]);

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

  // Update the handleSignOut function
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Clear localStorage
      localStorage.removeItem('selectedCard');
      localStorage.removeItem('currentStep');
      localStorage.removeItem('hasExistingTransactions');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

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
      // Store the complete card data
      localStorage.setItem('selectedCard', JSON.stringify(selectedCard));
      
      // Check for existing transactions
      const hasTransactions = await checkForExistingTransactions(selectedCardId);
      
      if (hasTransactions) {
        localStorage.setItem('hasExistingTransactions', 'true');
        localStorage.setItem('currentStep', 'transactions');
        toast({
          title: "Previous transactions found",
          description: "Loading your existing transactions...",
        });
      } else {
        localStorage.removeItem('hasExistingTransactions');
        localStorage.setItem('currentStep', 'setup');
      }
      
      navigate('/transactions');
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    
    // Find the full card data
    const selectedCard = creditCards.find(card => card.id === cardId);
    
    if (selectedCard) {
      // Always store the complete card object as JSON
      localStorage.setItem('selectedCard', JSON.stringify(selectedCard));
      // Set the current step for transactions page
      localStorage.setItem('currentStep', 'transactions');
    } else {
      console.error(`Selected card with ID ${cardId} not found in creditCards array`);
    }
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
          <Button onClick={() => navigate('/profile')} variant="outline" className="justify-start">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button onClick={handleSignOut} variant="outline" className="justify-start">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Add these helper functions after MobileMenu component:
const getOwnedCards = () => creditCards.filter(card => card.role === 'owner');
const getSharedCards = () => creditCards.filter(card => card.role === 'member');

// Add this component after the helper functions:
const CardSections = () => {
  const ownedCards = getOwnedCards();
  const sharedCards = getSharedCards();
  
  // DEBUG: Add these console logs
  // console.log('Total creditCards:', creditCards.length);
  // console.log('Owned cards:', ownedCards.length, ownedCards.map(c => c.card_name));
  // console.log('Shared cards:', sharedCards.length, sharedCards.map(c => c.card_name));
  
  return (
    <div className="space-y-8">
      {/* My Cards Section */}
      {(ownedCards.length > 0 || creditCards.length === 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">My Cards</h3>
            <span className="text-sm text-muted-foreground">({ownedCards.length})</span>
          </div>
          
          <div className="grid gap-6 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Add New Card Button - Always first in owned cards section */}
            <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[180px] sm:min-h-[200px]">
                <button
                  onClick={() => setShowAddCard(true)}
                  className="w-full flex flex-col items-center gap-3 sm:gap-4 text-blue-600 hover:text-blue-700"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-sm sm:text-base">Add New Card</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                onUpdate={() => fetchCreditCards()}
                isSelected={selectedCardId === card.id}
                onSelect={handleCardSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Shared with Me Section */}
      {sharedCards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Shared with Me</h3>
            <span className="text-sm text-muted-foreground">({sharedCards.length})</span>
          </div>
          
          <div className="grid gap-6 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sharedCards.map((card) => (
              <CreditCardDisplay
                key={card.id}
                card={card}
                onUpdate={() => fetchCreditCards()}
                isSelected={selectedCardId === card.id}
                onSelect={handleCardSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

  // Invitation processing effect
  useEffect(() => {
    // Get URL parameters
    const isInvite = searchParams.get('invite') === 'true';
    const cardId = searchParams.get('cardId');
    
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    
    const processInvitation = async () => {
      try {
        // Only show loading if we're actually going to do something
        setInvitationLoading(true);
        
        // Add a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted && invitationLoading) {
            setInvitationLoading(false);
            setInvitationError("The invitation process timed out. Please try again.");
            console.error("Invitation processing timed out");
          }
        }, 15000); // 15 second timeout
        
        if (!user) {
          // console.log("No user found, waiting for auth");
          return;
        }
        
        // Check if user is already a member of this card
        const { data: memberData, error: memberError } = await supabase
          .from('card_members')
          .select('id')
          .eq('credit_card_id', cardId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (!memberError && memberData) {
         // console.log("User is already a member of this card");
          // Already a member, we can skip the invitation processing
          if (isMounted) {
            setInvitationLoading(false);
            setCurrentStep('cards');  // Move to appropriate step
          }
          return;
        }
          
        // Find the pending invitation for this user and card
        const { data: invitation, error: inviteError } = await supabase
          .from('card_invitations')
          .select('*')
          .eq('credit_card_id', cardId)
          .eq('invited_email', user.email)
          .eq('status', 'pending')
          .maybeSingle();
          
        if (inviteError || !invitation) {
          // Check if there's an already accepted invitation
          const { data: acceptedInvite } = await supabase
            .from('card_invitations')
            .select('*')
            .eq('credit_card_id', cardId)
            .eq('invited_email', user.email)
            .eq('status', 'accepted')
            .maybeSingle();
            
          if (acceptedInvite) {
            // console.log("Invitation was already accepted");
            // Already processed, just continue to cards
            if (isMounted) {
              setInvitationLoading(false);
              setCurrentStep('cards');
            }
            return;
          }
          
          // No invitation found - this is unusual but possible
          console.error('No pending invitation found:', inviteError);
          if (isMounted) {
            setInvitationError("No valid invitation found. Please contact the card owner.");
            setInvitationLoading(false);
          }
          return;
        }
        
       // console.log("Processing invitation:", invitation.id);
        
        // Update the invitation status to accepted
        const { error: updateError } = await supabase
          .from('card_invitations')
          .update({
            status: 'accepted',
            invited_user_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', invitation.id);
          
        if (updateError) {
          console.error('Error updating invitation:', updateError);
          throw updateError;
        }
        
        // Add user to card_members
        const { error: memberAddError } = await supabase
          .from('card_members')
          .insert({
            credit_card_id: cardId,
            user_id: user.id,
            role: 'member'
          });
          
        if (memberAddError) {
          // If it's a duplicate key error, it's fine - user is already a member
          if (!memberAddError.message.includes('duplicate key')) {
            console.error('Error adding member:', memberAddError);
            throw memberAddError;
          }
        }
        
        // console.log("Invitation accepted successfully");
        
        // Get the card details
        const { data: cardData, error: cardError } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('id', cardId)
          .single();
          
        if (cardError) {
          console.error('Error fetching card:', cardError);
          throw cardError;
        }
        
        // Set the card as selected
        if (cardData) {
          localStorage.setItem('selectedCard', JSON.stringify(cardData));
          setSelectedCardId(cardData.id);
        }
        
        // Navigate to the cards step
        if (isMounted) {
          setCurrentStep('cards');
          setInvitationLoading(false);
        }
      } catch (error) {
        console.error('Error processing invitation:', error);
        if (isMounted) {
          setInvitationLoading(false);
          setInvitationError("Failed to process invitation. Please try again.");
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setInvitationLoading(false);
        }
      }
    };
    
    if (isInvite && cardId && user) {
      processInvitation();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      setInvitationLoading(false);
    };
  }, [searchParams, user, setCurrentStep, setSelectedCardId]);

  useEffect(() => {
    // Only run if user is authenticated and not loading
    if (user && !authLoading) {
      (async () => {
        const { token, tokenType } = await requestNotificationPermission();
        if (token && tokenType) {
          await saveUserPushToken(user.id, token, tokenType);
        }
      })();
    }
  }, [user, authLoading]);

  if (loading || processingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center p-4">
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
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
          {/* Responsive Header - IMPROVED ALIGNMENT */}
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                My Credit Cards
              </h1>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-3">
              <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Mobile Menu - Now properly aligned */}
            <div className="md:hidden flex items-center">
              {/* {creditCards.length > 0 && (
                <Button onClick={() => setShowAddCard(false)} variant="outline" size="sm" className="mr-2">
                  Back
                </Button>
              )} */}
              <MobileMenu />
            </div>
          </div>

          {/* User Welcome */}
          {user && (
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-2">
                Welcome back, {userProfile?.full_name || user.email}!
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                Select a credit card to start splitting bills with ease
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm sm:text-base">{errorMessage}</p>
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

          {/* Responsive Cards Grid - Updated to use CardSections */}
          <div className="max-w-7xl mx-auto px-4 sm:px-2">
            <CardSections />

            {/* Quick Actions */}
            <div className="mt-6 sm:mt-8 text-center">
              <Button
                onClick={handleStartSplitting}
                size={isMobile ? "default" : "lg"}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg w-full sm:w-auto"
                disabled={!selectedCardId || checkingTransactions}
              >
                {checkingTransactions ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Checking Transactions...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Start Splitting
                  </>
                )}
              </Button>
              {!selectedCardId && !checkingTransactions && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-5xl">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {creditCards.length > 0 ? 'Add New Credit Card' : 'Welcome to Splitify'}
            </h1>
          </div>
          
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-3">
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

          {/* Mobile Menu - Now positioned on the right with flex row and justify-between */}
          <div className="md:hidden flex w-full justify-between items-center">
            {creditCards.length > 0 && (
              <Button onClick={() => setShowAddCard(false)} variant="outline" size="sm">
                Back
              </Button>
            )}
            <div className={creditCards.length > 0 ? "ml-auto" : ""}>
              <MobileMenu />
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        {user && creditCards.length === 0 && (
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-2">
              Hello, {user.user_metadata?.full_name || user.email}!
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              Let's set up your credit cards to start splitting bills seamlessly
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-4xl mx-auto">
            <p className="text-red-700 text-sm sm:text-base">{errorMessage}</p>
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
          <div className="grid gap-4 sm:gap-6">
            {/* Add Credit Card Button or Form */}
            {!showAddCard && creditCards.length === 0 && (
                <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8">
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="w-full flex flex-col items-center gap-4 text-blue-600 hover:text-blue-700"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg sm:text-xl font-semibold">Add Your First Credit Card</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mt-2">
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
              <div className="text-center mt-6 sm:mt-8">
                <Button
                  onClick={handleStartSplitting}
                  size={isMobile ? "default" : "lg"}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg w-full sm:w-auto"
                  disabled={checkingTransactions}
                >
                  {checkingTransactions ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      Checking Transactions...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
function setCurrentStep(arg0: string) {
  throw new Error('Function not implemented.');
}

