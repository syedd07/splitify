import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, CreditCard, User, Mail, KeyRound, ShieldCheck, LogOut, Loader2, Check, Edit2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Profile = () => {
  const { user, userProfile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Add state for managing profile data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailChangeModalOpen, setIsEmailChangeModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [localUserProfile, setLocalUserProfile] = useState(userProfile);
  
  // Initialize profile data from auth context
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
    
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setLocalUserProfile(userProfile);
    }
  }, [user, userProfile]);

  // Fetch fresh profile data without using hook
  const fetchUpdatedProfile = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setLocalUserProfile(data);
      if (data?.full_name) {
        setFullName(data.full_name);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching updated profile:', error);
      return null;
    }
  };

  // Update profile information
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Get fresh profile data
      await fetchUpdatedProfile();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Request email change
  const handleEmailChange = async () => {
    if (!user) return;
    if (!newEmail.trim() || newEmail === user.email) {
      toast({
        title: "Invalid email",
        description: "Please enter a new email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail.trim()
      });
      
      if (error) throw error;
      
      toast({
        title: "Verification email sent",
        description: "Please check your new email address for a confirmation link.",
      });
      
      setIsEmailChangeModalOpen(false);
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast({
        title: "Email change failed",
        description: error.message || "There was a problem updating your email.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Request password reset
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        user.email,
        { redirectTo: `${window.location.origin}/profile?reset=true` }
      );
      
      if (error) throw error;
      
      setPasswordResetSent(true);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Password reset failed",
        description: error.message || "There was a problem sending the reset email.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Sign out - use the function from useAuth
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center">
            <User className="w-6 h-6 text-blue-600 mr-2" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              My Profile
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Manage your personal details and how your information is displayed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="flex items-center">
                    {isEditingName ? (
                      <div className="flex flex-1 items-center space-x-2">
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="flex-1"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsEditingName(false)}
                          disabled={isSaving}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleUpdateProfile}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-base">{fullName || 'Not set'}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsEditingName(true)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center">
                    <span className="flex-1 text-base">{email}</span>
                    <Dialog open={isEmailChangeModalOpen} onOpenChange={setIsEmailChangeModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4 mr-1" />
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Email Address</DialogTitle>
                          <DialogDescription>
                            Enter your new email address. You'll need to verify this email before the change takes effect.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="newEmail">New Email Address</Label>
                            <Input
                              id="newEmail"
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="your.new.email@example.com"
                            />
                          </div>
                          <Alert  className="bg-amber-50 text-amber-800 border-amber-200">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <AlertDescription>
                              You will be required to verify your new email address before the change takes effect. A verification link will be sent to your new email.
                            </AlertDescription>
                          </Alert>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEmailChangeModalOpen(false)}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleEmailChange}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4 mr-2" />
                            )}
                            Send Verification
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {/* Account Status */}
                <div className="space-y-2">
                  <Label>Account Status</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                    {user?.email_confirmed_at ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Account Created */}
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <div className="text-base">
                    {localUserProfile?.created_at ? new Date(localUserProfile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Unknown'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <KeyRound className="w-5 h-5 mr-2 text-blue-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password */}
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex items-center">
                    <span className="flex-1 text-base">••••••••</span>
                    <Dialog open={isPasswordResetModalOpen} onOpenChange={setIsPasswordResetModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4 mr-1" />
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            A password reset link will be sent to your email address.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {passwordResetSent ? (
                            <Alert className="bg-green-50 text-green-700 border-green-200">
                              <Check className="h-4 w-4 mr-2" />
                              <AlertDescription>
                                Password reset email sent! Please check your inbox for a link to reset your password.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              <AlertDescription>
                                For security reasons, we'll send a password reset link to your email address: {email}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <DialogFooter>
                          {passwordResetSent ? (
                            <Button 
                              onClick={() => {
                                setIsPasswordResetModalOpen(false);
                                setPasswordResetSent(false);
                              }}
                            >
                              Close
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                onClick={() => setIsPasswordResetModalOpen(false)}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handlePasswordReset}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4 mr-2" />
                                )}
                                Send Reset Link
                              </Button>
                            </>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {/* Last Sign In */}
                <div className="space-y-2">
                  <Label>Last Sign In</Label>
                  <div className="text-base">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown'}
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Password Requirements */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Password Requirements
                  </h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Minimum 6 characters in length</li>
                    <li>• We recommend using a mix of letters, numbers, and symbols</li>
                    <li>• Avoid using easily guessable information</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Account Management
                </CardTitle>
                <CardDescription>
                  Manage your account preferences and options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Go to Credit Cards */}
                <div className="space-y-2">
                  <Label>Credit Cards</Label>
                  <div className="flex items-center">
                    <span className="flex-1 text-base">Manage your credit cards</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/onboarding')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      View Cards
                    </Button>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Logout */}
                <div className="space-y-2">
                  <Label>Session</Label>
                  <div className="flex items-center">
                    <span className="flex-1 text-base">Sign out from your account</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSignOut}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;