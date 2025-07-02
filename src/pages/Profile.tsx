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
import { AlertCircle, ArrowLeft, CreditCard, User, Mail, KeyRound, ShieldCheck, LogOut, Loader2, Check, Edit2, X, Calendar, Clock } from 'lucide-react';
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
        { redirectTo: `${window.location.origin}/reset-password` }
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
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="self-start sm:mr-4 hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mr-3">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              My Profile
            </h1>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 h-12 bg-white/50 backdrop-blur-sm border border-white/20">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-200"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-200"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger 
              value="account"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-200"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Enhanced Profile Tab */}
          <TabsContent value="profile">
            <Card className="border border-blue-200 shadow-sm bg-white/50 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="text-lg sm:text-xl flex items-center text-blue-900">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Manage your personal details and how your information is displayed
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Enhanced Full Name Field */}
                <div className="space-y-3">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">
                    Full Name
                  </Label>
                  <div className="flex items-center">
                    {isEditingName ? (
                      <div className="flex flex-1 items-center space-x-2">
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="flex-1 h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsEditingName(false)}
                          disabled={isSaving}
                          className="h-11 px-3 hover:bg-gray-100"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleUpdateProfile}
                          disabled={isSaving}
                          className="h-11 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <span className="text-base font-medium text-gray-900">
                          {fullName || 'Not set'}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsEditingName(true)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Email Address Field */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email Address
                  </Label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <span className="text-base font-medium text-gray-900 break-all">{email}</span>
                    <Dialog open={isEmailChangeModalOpen} onOpenChange={setIsEmailChangeModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600 ml-2">
                          <Edit2 className="w-4 h-4 mr-1" />
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600" />
                            Change Email Address
                          </DialogTitle>
                          <DialogDescription>
                            Enter your new email address. You'll need to verify this email before the change takes effect.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="newEmail" className="text-sm font-medium">New Email Address</Label>
                            <Input
                              id="newEmail"
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="your.new.email@example.com"
                              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              You will be required to verify your new email address before the change takes effect.
                            </AlertDescription>
                          </Alert>
                        </div>
                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEmailChangeModalOpen(false)}
                            disabled={isSaving}
                            className="w-full sm:w-auto"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleEmailChange}
                            disabled={isSaving}
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                
                {/* Enhanced Account Status */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Account Status</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                    {user?.email_confirmed_at ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Account Created */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Account Created</Label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
                    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-base font-medium text-gray-900">
                      {localUserProfile?.created_at ? new Date(localUserProfile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Enhanced Security Tab */}
          <TabsContent value="security">
            <Card className="border border-orange-200 shadow-sm bg-white/50 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
                <CardTitle className="text-lg sm:text-xl flex items-center text-orange-900">
                  <KeyRound className="w-5 h-5 mr-2 text-orange-600" />
                  Security Settings
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Enhanced Password Field */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Password</Label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <span className="text-base font-medium text-gray-900">••••••••</span>
                    <Dialog open={isPasswordResetModalOpen} onOpenChange={setIsPasswordResetModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-600">
                          <Edit2 className="w-4 h-4 mr-1" />
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-orange-600" />
                            Reset Password
                          </DialogTitle>
                          <DialogDescription>
                            A password reset link will be sent to your email address.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {passwordResetSent ? (
                            <Alert className="bg-green-50 text-green-700 border-green-200">
                              <Check className="h-4 w-4" />
                              <AlertDescription>
                                Password reset email sent! Please check your inbox for a link to reset your password.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                For security reasons, we'll send a password reset link to your email address: <strong>{email}</strong>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                          {passwordResetSent ? (
                            <Button 
                              onClick={() => {
                                setIsPasswordResetModalOpen(false);
                                setPasswordResetSent(false);
                              }}
                              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                            >
                              Close
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                onClick={() => setIsPasswordResetModalOpen(false)}
                                disabled={isSaving}
                                className="w-full sm:w-auto"
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handlePasswordReset}
                                disabled={isSaving}
                                className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
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
                
                {/* Enhanced Last Sign In */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Last Sign In</Label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
                    <Clock className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-base font-medium text-gray-900">
                      {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Enhanced Password Requirements */}
                <div className="rounded-lg border-2 border-dashed border-orange-200 bg-gradient-to-r from-orange-50/50 to-red-50/50 p-4">
                  <h3 className="text-sm font-semibold text-orange-800 mb-3 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Password Requirements
                  </h3>
                  <ul className="text-sm text-orange-700 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      Minimum 6 characters in length
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      We recommend using a mix of letters, numbers, and symbols
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      Avoid using easily guessable information
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Enhanced Account Tab */}
          <TabsContent value="account">
            <Card className="border border-purple-200 shadow-sm bg-white/50 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                <CardTitle className="text-lg sm:text-xl flex items-center text-purple-900">
                  <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                  Account Management
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Manage your account preferences and options
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Enhanced Credit Cards Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Credit Cards</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <div className="mb-3 sm:mb-0">
                      <span className="text-base font-medium text-gray-900 block">Manage your credit cards</span>
                      <span className="text-sm text-gray-600">View and edit your payment methods</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/onboarding')}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      View Cards
                    </Button>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Enhanced Logout Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Session</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                    <div className="mb-3 sm:mb-0">
                      <span className="text-base font-medium text-gray-900 block">Sign out from your account</span>
                      <span className="text-sm text-gray-600">End your current session securely</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSignOut}
                      className="w-full sm:w-auto text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-600 hover:to-red-700 border-red-200 hover:border-red-600 shadow-md hover:shadow-lg transition-all duration-200"
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