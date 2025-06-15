
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  cardId: string;
  cardName: string;
  invitedEmail: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { cardId, cardName, invitedEmail, inviterName }: InvitationRequest = await req.json();

    // Generate invitation link
    const inviteUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/auth?invite=${cardId}&email=${encodeURIComponent(invitedEmail)}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Credit Ease Divide <onboarding@resend.dev>",
      to: [invitedEmail],
      subject: `You've been invited to share ${cardName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">You've been invited to Credit Ease Divide!</h2>
          
          <p>Hello,</p>
          
          <p><strong>${inviterName}</strong> has invited you to share access to their credit card <strong>"${cardName}"</strong> on Credit Ease Divide.</p>
          
          <p>Credit Ease Divide helps you easily split bills and track shared expenses with others.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p>If you already have an account, simply log in and you'll see the shared card. If you're new to Credit Ease Divide, you'll be able to create an account and immediately access the shared card.</p>
          
          <p>This invitation will expire in 7 days.</p>
          
          <p>Best regards,<br>The Credit Ease Divide Team</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation:", error);
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
