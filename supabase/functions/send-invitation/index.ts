
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviterName }: InvitationEmailRequest = await req.json();

    if (!email || !inviterName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const signupUrl = `https://ccardly.netlify.app/auth`;

    const emailResponse = await resend.emails.send({
      from: "Splitify <onboarding@resend.dev>",
      to: [email],
      subject: `${inviterName} invited you to join Splitify!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Splitify!</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Credit Ease Divide</p>
          </div>
          
          <div style="background: linear-gradient(to right, #dbeafe, #dcfce7); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">You're Invited!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              <strong>${inviterName}</strong> has invited you to join <strong>Splitify</strong> - the easiest way to split bills and manage shared expenses with credit cards.
            </p>
          </div>

          <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #1f2937; margin-top: 0;">What is Splitify?</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              <li>Split bills easily with friends and family</li>
              <li>Track shared expenses across multiple credit cards</li>
              <li>Manage transactions and calculate who owes what</li>
              <li>Simple, secure, and hassle-free expense sharing</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupUrl}" style="background: linear-gradient(to right, #2563eb, #16a34a); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Join Splitify Now
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${signupUrl}" style="color: #2563eb;">${signupUrl}</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              This invitation was sent by ${inviterName}. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
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
