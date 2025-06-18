
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Add Deno namespace declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteUserRequest {
  cardId: string;
  cardName: string;
  invitedEmail: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
   // console.log('Starting admin invite user function...');

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    // Create regular client to verify user auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('User not authenticated:', authError);
      throw new Error('User not authenticated');
    }

    const { cardId, cardName, invitedEmail, inviterName }: InviteUserRequest = await req.json();

   // console.log('Processing invitation request:', { cardId, cardName, invitedEmail, inviterName });

    // Check if user is already invited or a member
    const { data: existingInvite } = await supabase
      .from('card_invitations')
      .select('*')
      .eq('credit_card_id', cardId)
      .eq('invited_email', invitedEmail.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'User already invited' }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is already a member
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invitedEmail.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from('card_members')
        .select('*')
        .eq('credit_card_id', cardId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'User already a member' }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Create the invitation in database
    const { error: inviteError } = await supabase
      .from('card_invitations')
      .insert({
        credit_card_id: cardId,
        inviter_user_id: user.id,
        invited_email: invitedEmail.toLowerCase(),
      });

    if (inviteError) {
      console.error('Error creating invitation record:', inviteError);
      throw inviteError;
    }

    // Generate invitation URL
    const inviteUrl = `https://ccardly.netlify.app/auth?invite=${cardId}&email=${encodeURIComponent(invitedEmail.toLowerCase())}`;

    // Check if user already exists in auth.users
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(invitedEmail.toLowerCase());
    
    if (existingUser.user) {
    //  console.log('User already exists, adding as member directly');
      
      // Add user as member directly since they already have an account
      const { error: memberError } = await supabaseAdmin
        .from('card_members')
        .insert({
          credit_card_id: cardId,
          user_id: existingUser.user.id,
          role: 'member'
        });

      if (memberError) {
        console.error('Error adding existing user as member:', memberError);
        throw memberError;
      }

      // Update invitation status
      await supabaseAdmin
        .from('card_invitations')
        .update({ 
          status: 'accepted',
          invited_user_id: existingUser.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('credit_card_id', cardId)
        .eq('invited_email', invitedEmail.toLowerCase());

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User added to card successfully' 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // User doesn't exist, create invitation with proper metadata
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invitedEmail.toLowerCase(), 
      {
        redirectTo: inviteUrl,
        data: {
          invitation_type: 'card_invitation',
          card_id: cardId,
          card_name: cardName,
          inviter_name: inviterName,
          invited_email: invitedEmail.toLowerCase(),
        }
      }
    );

    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      
      // If the error is that user already exists but we missed it above
      if (emailError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User already exists. Please ask them to log in and they will see the shared card.',
            info: 'User may need to log out and back in to see the shared card.'
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Invitation created but email delivery failed. User can still access by logging in.',
          emailError: emailError.message 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

   // console.log('Invitation email sent successfully via Supabase admin');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully' 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in admin-invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
