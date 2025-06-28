// Create this file if it doesn't exist, or update your existing callback logic:

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          
          // Check if this was an invited user
          const inviteCardId = searchParams.get('invite');
          
          if (inviteCardId && user.user_metadata?.invitation_type === 'card_invitation') {
            try {
              // Find the invitation and complete the process
              const { data: invitation, error: inviteError } = await supabase
                .from('card_invitations')
                .select('id')
                .eq('credit_card_id', inviteCardId)
                .eq('invited_user_id', user.id)
                .eq('status', 'accepted')
                .maybeSingle();

              if (!inviteError && invitation) {
                // Make sure user is in card_members table
                const { error: memberError } = await supabase
                  .from('card_members')
                  .upsert({
                    credit_card_id: inviteCardId,
                    user_id: user.id,
                    role: 'member'
                  }, {
                    onConflict: 'credit_card_id,user_id'
                  });

                if (memberError && !memberError.message.includes('duplicate key')) {
                  console.error("Error ensuring member exists:", memberError);
                } else {
                  toast({
                    title: "Welcome!",
                    description: "You now have access to the shared card.",
                  });
                }
              }
            } catch (error) {
              console.error('Error completing invitation process:', error);
            }
          }
          
          // Redirect to the appropriate page
          if (inviteCardId) {
            navigate(`/onboarding?invite=true&cardId=${inviteCardId}`);
          } else {
            navigate('/onboarding');
          }
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-muted-foreground">Completing your invitation...</p>
      </div>
    </div>
  );
};

export default AuthCallback;