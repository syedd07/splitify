
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bin } = await req.json();

    if (!bin || bin.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Invalid BIN - minimum 6 digits required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Call the BIN checker API
    const response = await fetch(`https://bin-ip-checker.p.rapidapi.com/?bin=${bin}`, {
      method: 'POST',
      headers: {
        'X-Rapidapi-Key': rapidApiKey,
        'X-Rapidapi-Host': 'bin-ip-checker.p.rapidapi.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bin }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the response to our expected format
    const result = {
      brand: data.brand || data.scheme || 'Unknown',
      type: data.type || 'Unknown',
      country: data.country?.name || data.country || 'Unknown',
      bank: data.bank?.name || data.issuer || 'Unknown',
      valid: data.valid !== false && !data.error
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('BIN verification error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to verify card number',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
