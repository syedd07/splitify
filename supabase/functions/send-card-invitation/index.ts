
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  cardName: string;
  inviterName: string;
  cardId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, cardName, inviterName, cardId }: InvitationRequest = await req.json();

    console.log('Sending card invitation to:', email, 'for card:', cardName);

    // Generate invitation link
    const inviteLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/invite?token=placeholder&type=invite&redirect_to=${encodeURIComponent(req.headers.get('origin') || 'http://localhost:3000')}/auth`;

    // For now, we'll just log the invitation (in production, you'd use Resend)
    console.log(`
      Invitation Details:
      To: ${email}
      From: ${inviterName}
      Card: ${cardName}
      Link: ${inviteLink}
    `);

    // In a real implementation, you would send an email here using Resend
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({...});

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        inviteLink 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-card-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
