import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Loading and status states
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Error state
  const [error, setError] = useState('');

  useEffect(() => {
    const validateSession = async () => {
      try {
        setIsValidating(true);
        
        // Check if user has a valid session (from email link)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session validation error:', error);
          setError('Invalid or expired reset link');
          setIsValidSession(false);
          
          // Redirect to auth page after 3 seconds
          setTimeout(() => {
            navigate('/auth', { 
              state: { 
                message: 'Your password reset link has expired. Please request a new one.' 
              }
            });
          }, 3000);
          return;
        }

        if (!session) {
          console.log('No session found - user likely accessed page directly');
          setError('No valid reset session found');
          setIsValidSession(false);
          
          // Redirect to auth page after 3 seconds
          setTimeout(() => {
            navigate('/auth', { 
              state: { 
                message: 'Please use the reset link from your email to access this page.' 
              }
            });
          }, 3000);
          return;
        }

        // Valid session found
        console.log('Valid session found:', session.user?.email);
        setIsValidSession(true);
        
      } catch (error) {
        console.error('Unexpected error during validation:', error);
        setError('An unexpected error occurred');
        setIsValidSession(false);
        
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [navigate]);

  const handlePasswordUpdate = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Validate password length
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      // Update password using Supabase
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        setError(error.message || 'Failed to update password');
        return;
      }

      console.log('Password updated successfully:', data.user?.email);
      
      // Show success state
      setResetSuccess(true);
      
      // Show toast notification
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });

      // Redirect to auth page after 3 seconds
      setTimeout(() => {
        navigate('/auth', {
          state: {
            message: 'Password updated successfully! Please sign in with your new password.'
          }
        });
      }, 3000);

    } catch (error) {
      console.error('Unexpected error during password update:', error);
      setError('An unexpected error occurred while updating your password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Loading/Validating State */}
            {isValidating && (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Validating reset link...</p>
              </div>
            )}

            {/* Error State */}
            {!isValidating && !isValidSession && error && (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-gray-600">
                  Redirecting to login page in a few seconds...
                </p>
              </div>
            )}

            {/* Success State */}
            {resetSuccess && (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Password reset successfully! You can now sign in with your new password.
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-gray-600">
                  Redirecting to login page...
                </p>
              </div>
            )}

            {/* Password Reset Form - Valid Session */}
            {!isValidating && isValidSession && !resetSuccess && (
              <div className="space-y-4">
                {/* New Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li className={`flex items-center gap-2 ${newPassword.length >= 6 ? 'text-green-600' : ''}`}>
                      {newPassword.length >= 6 ? '✅' : '•'} Minimum 6 characters
                    </li>
                    <li className={`flex items-center gap-2 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-green-600' : ''}`}>
                      {newPassword && confirmPassword && newPassword === confirmPassword ? '✅' : '•'} Passwords match
                    </li>
                  </ul>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={
                    isLoading || 
                    !newPassword || 
                    !confirmPassword || 
                    newPassword !== confirmPassword || 
                    newPassword.length < 6
                  }
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;