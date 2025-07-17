import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Loader2, Mail, UserPlus, CheckCircle, Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Check for invitation parameters
  const inviteCardId = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');

  useEffect(() => {
    // Pre-fill email if coming from invitation
    if (inviteEmail) {
      setEmail(decodeURIComponent(inviteEmail));
    }

    // Only handle redirects if we have a user and auth state is fully loaded
    if (user) {
      console.log("Auth page: User is authenticated", {
        id: user.id,
        hasPassword: !!user.last_sign_in_at,
        inviteParams: { inviteCardId, inviteEmail },
      });
      
      // For invited users coming from an invite link
      const cameFromInvite = !!inviteCardId && !!inviteEmail;
      
      if (cameFromInvite) {
        // For invited users, check if they've completed setup
        if (!user.last_sign_in_at) {
          console.log("Invited user needs setup - keeping on Auth page");
          toast({
            title: "Complete Your Account Setup",
            description: "Please set your name and password to access your shared card.",
            duration: 8000,
          });
          return; // Don't redirect yet
        }
      }
      
      // Handle redirect for authenticated users
      if (inviteCardId) {
        console.log("Redirecting to onboarding with invite params");
        navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
      } else {
        console.log("Redirecting to onboarding");
        navigate('/onboarding');
      }
    }

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change in Auth.tsx:", event);
      
      if (session) {
        const isNewUser = !session.user.email_confirmed_at;
        const isInvitedUser = 
          session.user.app_metadata?.provider === 'email' && 
          !session.user.last_sign_in_at &&
          session.user.user_metadata?.invitation_type === 'card_invitation';
          
        // For unverified/invited users with card invites, stay on this page
        if ((isNewUser || isInvitedUser) && inviteCardId) {
          toast({
            title: "Setup needed",
            description: "Please set your password to complete your account setup.",
          });
          return; // Don't redirect
        }
        
        // For verified users, proceed to the appropriate page
        if (inviteCardId) {
          navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
        } else {
          navigate('/onboarding');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, inviteCardId, inviteEmail, user, toast, searchParams]);

  // Update the handleSignUp function to better handle database errors:
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Full name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth/callback${inviteCardId ? `?invite=${inviteCardId}` : ''}`;
      
      console.log("Starting signup with email:", email);

      // Clean the inputs
      const cleanEmail = email.trim().toLowerCase();
      const cleanFullName = fullName.trim();

      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Account exists",
          description: "An account with this email already exists. Please sign in instead.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Do the regular signup flow - this creates the user properly
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: cleanFullName,
            invitation_type: inviteCardId ? 'card_invitation' : undefined,
            card_id: inviteCardId || undefined,
            password_set: 'true' // Mark password as set immediately
          }
        }
      });

      if (error) {
        console.error("Signup error details:", error);
        
        // Handle specific database errors
        if (error.message.includes("Database error saving new user")) {
          toast({
            title: "Account Creation Issue",
            description: "There was a problem creating your account. Please try again in a moment.",
            variant: "destructive",
          });
        } else if (error.message.includes("User already registered")) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
        throw error;
      }
      
      // Show success message
      if (inviteCardId) {
        toast({
          title: "Invitation accepted!",
          description: "Please check your email to verify your account.",
        });
        
        // Process the invitation immediately after successful signup
        if (data?.user) {
          try {
            // Wait a moment for the profile to be created by the trigger
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const token = searchParams.get('token');
            let updateQuery;
            
            if (token) {
              // If we have a token, use it as the primary lookup method
              updateQuery = supabase
                .from('card_invitations')
                .update({
                  status: 'accepted',
                  invited_user_id: data.user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', token);
            } else {
              // Fallback to the old method
              updateQuery = supabase
                .from('card_invitations')
                .update({
                  status: 'accepted',
                  invited_user_id: data.user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('credit_card_id', inviteCardId)
                .eq('invited_email', cleanEmail)
                .eq('status', 'pending');
            }
            
            const { error: updateError } = await updateQuery;
            
            if (updateError) {
              console.error("Error updating invitation status:", updateError);
            } else {
              // Note: Don't add to card_members here - let the trigger handle it
              console.log("Invitation status updated to accepted");
            }
          } catch (updateError) {
            console.error("Error processing invitation during signup:", updateError);
            // Non-critical error, don't show to user
          }
        }
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email for the confirmation link.",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      // Error toast is already handled above
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean the email input to avoid whitespace issues
      const cleanEmail = email.trim().toLowerCase();
      
      console.log('Attempting to sign in with:', cleanEmail);
      
      // First try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        
        // Get detailed information about this user to help debug
        const { data: authUser, error: authError } = await supabase.auth.admin
          .getUserById(cleanEmail)
          .catch(() => ({ data: null, error: null }));
          
        console.log('Auth user lookup result:', { authUser, authError });
        
        // Check if this user exists in profiles but can't log in
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('email', cleanEmail)
          .maybeSingle();
          
        console.log('Profile lookup result:', profileData);
        
        if (profileData) {
          // User exists in profiles but can't log in - likely an auth issue
          toast({
            title: "Account Issue",
            description: "Your account exists but there may be an issue with your password. Try resetting it.",
            action: (
              <Button variant="outline" size="sm" onClick={() => handlePasswordReset()}>
                Reset Password
              </Button>
            ),
            duration: 10000, // Show for 10 seconds
          });
        } else {
          // Standard error
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive",
          });
        }
      } else {
        // Success! Update the user profile if needed
        if (data.user) {
          // Check if user has profile info
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', data.user.id)
            .maybeSingle();
            
          //console.log('Profile after login:', profileData);
            
          if (!profileError && (!profileData || !profileData.full_name) && 
              (data.user.user_metadata?.full_name || data.user.user_metadata?.name)) {
            // Create or update the profile with the metadata
            const { error: updateError } = await supabase
              .from('profiles')
              .upsert({ 
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
                email: data.user.email,
                updated_at: new Date().toISOString()
              });
              
            if (updateError) {
              console.error('Error updating profile during login:', updateError);
            } else {
              console.log('Profile updated during login');
            }
          }
        }
        
        // Successful login toast
        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
          duration: 3000, // Show for 3 seconds
        });
        
        // Add to the handleSignIn function, in the success block
        if (data?.user && inviteCardId && inviteEmail) {
          // If user is logging in with an invitation, accept the invitation
          try {
            // First verify the invitation is for this email
            const userEmail = data.user.email?.toLowerCase();
            const invitedEmail = decodeURIComponent(inviteEmail).toLowerCase();
            
            if (userEmail === invitedEmail) {
              // Update the invitation status
              const { error: updateError } = await supabase
                .from('card_invitations')
                .update({
                  status: 'accepted',
                  invited_user_id: data.user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('credit_card_id', inviteCardId)
                .eq('invited_email', invitedEmail)
                .eq('status', 'pending');
                
              if (updateError) {
                console.error("Error accepting invitation:", updateError);
              } else {
                // Add user to card_members
                const { error: memberError } = await supabase
                  .from('card_members')
                  .insert({
                    credit_card_id: inviteCardId,
                    user_id: data.user.id,
                    role: 'member'
                  })
                  .select();
                  
                if (memberError && !memberError.message.includes('duplicate key')) {
                  console.error("Error adding member:", memberError);
                }
                
                toast({
                  title: "Invitation Accepted!",
                  description: "You now have access to the shared card.",
                });
              }
            } else {
              toast({
                title: "Email Mismatch",
                description: "This invitation is for a different email address.",
                variant: "destructive",
              });
            }
          } catch (inviteError) {
            console.error("Error processing invitation during login:", inviteError);
          }
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/profile?reset=true`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback${inviteCardId ? `?invite=${inviteCardId}` : ''}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: inviteCardId ? {
            invite: inviteCardId,
            email: inviteEmail || ''
          } : undefined
        }
      });

      if (error) {
        console.error('Google sign in error:', error);
        toast({
          title: "Google Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this new useEffect to check invitation validity on load
  useEffect(() => {
    const checkInvitationValidity = async () => {
      if (inviteCardId && inviteEmail) {
        // Show checking status to the user
        toast({
          title: "Checking invitation...",
          description: "Verifying this invitation link",
        });

        try {
          const decodedEmail = decodeURIComponent(inviteEmail);
          console.log("Checking invitation for:", {
            cardId: inviteCardId,
            decodedEmail,
            token: searchParams.get('token')
          });

          // First try finding by token (more reliable)
          const token = searchParams.get('token');
          let invitationQuery;
          
          if (token) {
            // If we have a token, use it as the primary lookup method
            invitationQuery = supabase
              .from('card_invitations')
              .select('expires_at, status, invited_email')
              .eq('id', token)
              .eq('credit_card_id', inviteCardId)
              .maybeSingle(); // Use maybeSingle instead of single
          } else {
            // Fallback to email-based lookup
            invitationQuery = supabase
              .from('card_invitations')
              .select('expires_at, status')
              .eq('credit_card_id', inviteCardId)
              .eq('invited_email', decodedEmail.toLowerCase())
              .maybeSingle(); // Use maybeSingle instead of single
          }
          
          const { data, error } = await invitationQuery;
          
          // Log for debugging
          console.log("Invitation query result:", { data, error });
          
          if (error || !data) {
            toast({
              title: "Invalid Invitation",
              description: "This invitation link is invalid or has been removed",
              variant: "destructive",
            });
            return;
          }
          
          // If we found by token, verify the email matches
          if (token && data.invited_email.toLowerCase() !== decodedEmail.toLowerCase()) {
            toast({
              title: "Email Mismatch",
              description: "This invitation is for a different email address",
              variant: "destructive",
            });
            return;
          }
          
          // Check if invitation is already used
          if (data.status !== 'pending') {
            toast({
              title: "Invitation Already Used",
              description: "This invitation has already been accepted or declined",
              variant: "destructive",
            });
            return;
          }
          
          // Check if invitation is expired
          if (new Date(data.expires_at) < new Date()) {
            toast({
              title: "Invitation Expired",
              description: "This invitation link has expired",
              variant: "destructive",
            });
            return;
          }

          // Invitation is valid
          toast({
            title: "Valid Invitation",
            description: "You can accept this invitation by signing up or logging in",
          });
        } catch (error) {
          console.error("Error validating invitation:", error);
          toast({
            title: "Error",
            description: "Could not verify the invitation. Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    
    if (inviteCardId && inviteEmail) {
      checkInvitationValidity();
    }
  }, [inviteCardId, inviteEmail, toast, supabase]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <div className="flex flex-col items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Splitify
              </h1>
              <p className="text-[8px] mt-1 text-gray-500 font-medium tracking-wider">
              Credit · Ease · Divide
              </p>
            </div>
          </div>
          {inviteCardId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-medium">You've been invited!</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Sign up or log in to access the shared credit card.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={inviteCardId ? "signup" : "signin"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!inviteEmail}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                {/* Google Sign In Button */}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Sign in with Google
                </Button>
                
                <div className="text-center mt-4">
                  <Button 
                    variant="link" 
                    onClick={handlePasswordReset}
                    className="text-sm text-blue-600"
                  >
                    Trouble logging in? Reset your password
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!inviteEmail}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                {/* Google Sign Up Button */}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Sign up with Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
