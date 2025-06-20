import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCardId = searchParams.get('invite');
  const [processing, setProcessing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailVerificationCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          toast({
            title: "Authentication Error",
            description: "There was an issue with your verification. Please try again.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }
        
        if (data.session && data.session.user) {
          const user = data.session.user;
          console.log("User authenticated:", user.id);
          
          // Handle invitation if there is one
          if (inviteCardId) {
            try {
              console.log("Processing invitation for card:", inviteCardId);
              
              // 1. Get the invitation based on card ID and user email
              const { data: inviteData, error: inviteError } = await supabase
                .from('card_invitations')
                .select('*')
                .eq('credit_card_id', inviteCardId)
                .eq('invited_email', user.email)
                .eq('status', 'pending')
                .single();
                
              if (inviteError || !inviteData) {
                console.error('Error finding invitation:', inviteError);
                // Continue to onboarding anyway
                navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
                return;
              }
              
              console.log("Found invitation:", inviteData.id);
              
              // 2. Update the invitation status and set the user ID
              const { error: updateError } = await supabase
                .from('card_invitations')
                .update({
                  status: 'accepted',
                  invited_user_id: user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', inviteData.id);
                
              if (updateError) {
                console.error('Error updating invitation:', updateError);
              }
              
              // 3. Add the user to card_members
              const { error: memberError } = await supabase
                .from('card_members')
                .insert({
                  credit_card_id: inviteCardId,
                  user_id: user.id,
                  role: 'member'
                });
                
              if (memberError) {
                console.error('Error adding member:', memberError);
                // If it's a duplicate key error, it's fine - user is already a member
                if (!memberError.message.includes('duplicate key')) {
                  throw memberError;
                }
              }
              
              // 4. Update the user's profile name if needed
              if (user.user_metadata?.full_name) {
                const { error: profileError } = await supabase
                  .from('profiles')
                  .upsert({
                    id: user.id,
                    full_name: user.user_metadata.full_name,
                    email: user.email,
                    updated_at: new Date().toISOString()
                  });
                  
                if (profileError) {
                  console.error('Error updating profile:', profileError);
                }
              }
              
              console.log("Invitation processing completed successfully");
              
              // Navigate to onboarding with the card
              navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
            } catch (inviteProcessError) {
              console.error('Error processing invitation:', inviteProcessError);
              // Continue to onboarding anyway
              navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
            }
          } else {
            navigate('/onboarding');
          }
        } else {
          // No session, redirect to auth
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/auth');
      } finally {
        setProcessing(false);
      }
    };

    handleEmailVerificationCallback();
  }, [navigate, inviteCardId, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          {processing ? "Verifying your account..." : "Verification complete!"}
        </h2>
        <p className="text-gray-600 mb-6">
          {processing 
            ? "Please wait while we complete the verification process." 
            : "You'll be redirected automatically in a moment."}
        </p>
        {!processing && (
          <div className="animate-pulse">
            <p className="text-blue-600">Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;