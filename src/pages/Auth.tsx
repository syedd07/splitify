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

    // For existing users only: if already authenticated, redirect appropriately
    if (user) {
      if (inviteCardId) {
        navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
      } else {
        navigate('/onboarding');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Check if this is a new sign-up (registration)
        if (event === 'SIGNED_IN') {
          // Get the user's metadata to see if they've just signed up
          const isNewUser = !session.user.email_confirmed_at;
          
          // For new users, we should keep them on the auth page until email verification
          if (isNewUser && inviteCardId) {
            toast({
              title: "Verification needed",
              description: "Please check your email and verify your account before continuing.",
            });
            // Don't redirect yet - they need to verify email first
            return;
          }
          
          // For verified users, proceed with redirection
          if (inviteCardId) {
            navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
          } else {
            navigate('/onboarding');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, inviteCardId, inviteEmail, user, toast]);

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
      // Always prioritize email verification for invitations
      const redirectUrl = `${window.location.origin}/auth/callback${inviteCardId ? `?invite=${inviteCardId}` : ''}`;

      // First, add the full name to metadata AND user data
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim(), // Add both versions to ensure it's captured
          }
        }
      });

      if (error) throw error;

      // Log user data for debugging
      console.log("User signup data:", data.user);

      // Important: Ensure the user exists before proceeding
      if (data.user && data.user.id) {
        // Create profile record with full name - AFTER successful user creation
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
          
        if (profileError) {
          console.error('Error updating profile:', profileError);
          // Try again with insert if upsert fails
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName.trim(),
              email: email.trim().toLowerCase(),
              updated_at: new Date().toISOString(),
            });
            
          if (insertError) {
            console.error('Error inserting profile:', insertError);
          }
        }
      }

      // Show appropriate message for invited users
      if (inviteCardId) {
        toast({
          title: "Just one more step!",
          description: "Please check your email and verify your account to access the shared card.",
        });
      } else if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Success!",
          description: "Check your email for the confirmation link.",
        });
      } else if (data.user && data.user.email_confirmed_at) {
        toast({
          title: "Success!",
          description: "Account created successfully.",
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
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
        
        // Check if this user exists but has auth issues
        if (error.message.includes('Invalid login credentials')) {
          // Try checking for a user with this email in the profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', cleanEmail)
            .maybeSingle();
            
          if (!profileError && profileData) {
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
            
            // Also suggest email verification might be incomplete
            toast({
              title: "Email Verification",
              description: "Make sure you've verified your email address by clicking the link we sent you.",
              duration: 8000,
            });
          } else {
            // User doesn't exist in profiles - standard error
            throw error;
          }
        } else {
          throw error;
        }
      } else {
        // Success! Update the user profile if needed
        if (data.user) {
          // Check if user has profile info
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.user.id)
            .maybeSingle();
            
          if (!profileError && profileData && !profileData.full_name && data.user.user_metadata?.full_name) {
            // Update the profile with the metadata if missing
            await supabase
              .from('profiles')
              .update({ 
                full_name: data.user.user_metadata.full_name,
                updated_at: new Date().toISOString()
              })
              .eq('id', data.user.id);
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
