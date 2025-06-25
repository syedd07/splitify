import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Loader2, Mail, UserPlus, CheckCircle } from 'lucide-react';
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

    // Add debug info
    if (user && inviteCardId) {
      console.log("Invited user state:", {
        id: user.id,
        email: user.email,
        hasPassword: !!user.last_sign_in_at,
        inviteParams: { inviteCardId, inviteEmail },
        metadata: user.user_metadata,
        appMetadata: user.app_metadata
      });
    }

    if (user) {
      // MUCH MORE AGGRESSIVE detection for invited users
      // If they came from an invite link, ALWAYS show the setup form first
      const cameFromInvite = !!inviteCardId && !!inviteEmail;
      
      if (cameFromInvite) {
        // For invited users, ALWAYS show the password setup form first
        // Only redirect if we know they've logged in before (has password)
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
      
      // Only regular authenticated users or invited users with passwords can proceed
      if (inviteCardId) {
        navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
      } else {
        navigate('/onboarding');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Similar logic for auth state changes
        const isNewUser = !session.user.email_confirmed_at;
        const isInvitedUser = 
          session.user.app_metadata?.provider === 'email' && 
          !session.user.last_sign_in_at &&
          session.user.user_metadata?.invitation_type === 'card_invitation';
          
        if ((isNewUser || isInvitedUser) && inviteCardId) {
          toast({
            title: "Setup needed",
            description: "Please set your password to complete your account setup.",
          });
          // Don't redirect yet
          return;
        }
        
        // For verified users with passwords set
        if (inviteCardId) {
          navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
        } else {
          navigate('/onboarding');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, inviteCardId, inviteEmail, user, toast, searchParams]);

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
      // For invited users, use the invitation flow
      const redirectUrl = `${window.location.origin}/auth/callback${inviteCardId ? `?invite=${inviteCardId}` : ''}`;
      
      console.log("Starting signup with email:", email);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
            invitation_type: inviteCardId ? 'card_invitation' : undefined,
            card_id: inviteCardId || undefined
          }
        }
      });

      if (error) throw error;
      
      if (data?.user && inviteCardId) {
        // Explicitly update the user's metadata
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName.trim(),
              invitation_type: 'card_invitation',
              card_id: inviteCardId
            }
          });
          
          console.log("Updated user metadata");
          
          // Ensure profile exists
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              email: email.trim().toLowerCase(),
              updated_at: new Date().toISOString()
            });
            
          if (profileError) {
            console.error("Error ensuring profile exists:", profileError);
          }
        } catch (updateError) {
          console.error("Error updating user metadata:", updateError);
        }
      }

      // Show success message but don't try to create a profile here
      // The profile will be created by the database trigger after email verification
      
      if (inviteCardId) {
        toast({
          title: "Invitation accepted!",
          description: "Please check your email to verify your account.",
        });
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email for the confirmation link.",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
            
          console.log('Profile after login:', profileData);
            
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

  // Add this function to the Auth component
  const checkEmailVerificationStatus = async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      
      // Get the current session to check if email is verified
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && session.user.email === email.trim()) {
        // Email is verified if email_confirmed_at exists
        const isVerified = !!session.user.email_confirmed_at;
        
        if (isVerified && inviteCardId) {
          // Email is verified and there's an invitation - proceed to onboarding
          navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
        } else if (!isVerified) {
          toast({
            title: "Email not verified",
            description: "Please check your inbox and verify your email before continuing.",
          });
        }
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Verification status indicator for invited users
  const renderInvitationStatus = () => {
    if (!inviteCardId) return null;
    
    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h3 className="text-sm font-medium text-blue-700 mb-1">Invitation Status</h3>
        {user ? (
          user.email_confirmed_at ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Email verified! Redirecting to shared card...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email verification required. Please check your inbox.</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-blue-600">
            <UserPlus className="w-4 h-4" />
            <span className="text-sm">Please sign up or log in to access the shared card.</span>
          </div>
        )}
        {user && !user.email_confirmed_at && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 text-xs" 
            onClick={checkEmailVerificationStatus}
          >
            I've verified my email
          </Button>
        )}
      </div>
    );
  };

  // Add this function to repair existing invited users
  const repairInvitedUser = async () => {
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
      // This will force a password reset to fix authentication issues
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/profile?reset=true`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Account repair initiated",
        description: "Check your email to reset your password and fix your account",
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

  // Add this new function to handle invited users who need to set a password
  const handleInvitedUserSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Full name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim() || password.length < 6) {
      toast({
        title: "Valid password required",
        description: "Please enter a password with at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // First update the user's metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          full_name: fullName.trim(),
          invitation_type: 'card_invitation',
          card_id: inviteCardId || undefined
        }
      });
      
      if (updateError) throw updateError;
      
      // Then update their profile - even if user is null, use the known email
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }
      
      toast({
        title: "Account setup complete!",
        description: "You can now access your shared card.",
      });
      
      // Ensure we process the invitation properly
      if (inviteCardId) {
        // Get invitation details and update status if needed
        const { data: inviteData } = await supabase
          .from('card_invitations')
          .select('*')
          .eq('credit_card_id', inviteCardId)
          .eq('invited_email', email.toLowerCase())
          .eq('status', 'pending')
          .maybeSingle();
          
        if (inviteData) {
          // Update invitation status
          await supabase
            .from('card_invitations')
            .update({
              status: 'accepted',
              invited_user_id: user.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', inviteData.id);
        }
      }
      
      // Redirect to onboarding after short delay
      setTimeout(() => {
        if (inviteCardId) {
          navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
        } else {
          navigate('/onboarding');
        }
      }, 1500);
    } catch (error: any) {
      console.error("Account setup error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
                {/* Special button for invited users who need to set password - SHOW MORE AGGRESSIVELY */}
                {inviteEmail && (
                  <Card className="mt-6 bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-green-700 mb-3">
                        <CheckCircle className="h-5 w-5" />
                        <h3 className="font-medium">Invitation Accepted!</h3>
                      </div>
                      <p className="text-sm text-green-700 mb-4">
                        Complete your account setup below to access your shared card.
                      </p>
                      <Button 
                        type="button"
                        onClick={handleInvitedUserSetup} 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Setting up account...
                          </>
                        ) : (
                          'Complete Account Setup'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </form>
            </TabsContent>
          </Tabs>

          {renderInvitationStatus()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
