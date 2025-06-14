
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
    console.log('API Response:', data);
    
    // Check if we got meaningful data or if we should use fallback detection
    const hasValidData = data.brand && data.brand !== 'Unknown' && data.brand.trim() !== '';
    
    let result;
    
    if (hasValidData) {
      // Use API data if available
      result = {
        brand: data.brand || data.scheme || 'Unknown',
        type: data.type || 'Unknown',
        country: data.country?.name || data.country || 'Unknown',
        bank: data.bank?.name || data.issuer || 'Unknown',
        valid: data.valid !== false && !data.error,
        source: 'api'
      };
    } else {
      // Fallback to basic BIN range detection for common Indian cards
      result = detectCardFromBIN(bin);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('BIN verification error:', error);
    
    // If API fails, try fallback detection
    try {
      const { bin } = await req.json();
      const fallbackResult = detectCardFromBIN(bin);
      
      return new Response(
        JSON.stringify(fallbackResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (fallbackError) {
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
  }
});

// Fallback function to detect card type from BIN ranges
function detectCardFromBIN(bin: string) {
  const binNum = parseInt(bin.substring(0, 6));
  
  // Visa: starts with 4
  if (bin[0] === '4') {
    return {
      brand: 'Visa',
      type: 'Credit',
      country: 'India',
      bank: 'Unknown',
      valid: true,
      source: 'fallback'
    };
  }
  
  // Mastercard: 51-55, 2221-2720
  if ((binNum >= 510000 && binNum <= 559999) || (binNum >= 222100 && binNum <= 272099)) {
    return {
      brand: 'Mastercard',
      type: 'Credit',
      country: 'India',
      bank: 'Unknown',
      valid: true,
      source: 'fallback'
    };
  }
  
  // RuPay: 60, 65, 81, 82, 508
  if (bin.startsWith('60') || bin.startsWith('65') || bin.startsWith('81') || bin.startsWith('82') || bin.startsWith('508')) {
    return {
      brand: 'RuPay',
      type: 'Credit',
      country: 'India',
      bank: 'Unknown',
      valid: true,
      source: 'fallback'
    };
  }
  
  // American Express: 34, 37
  if (bin.startsWith('34') || bin.startsWith('37')) {
    return {
      brand: 'American Express',
      type: 'Credit',
      country: 'India',
      bank: 'Unknown',
      valid: true,
      source: 'fallback'
    };
  }
  
  // Diners Club: 30, 36, 38
  if (bin.startsWith('30') || bin.startsWith('36') || bin.startsWith('38')) {
    return {
      brand: 'Diners Club',
      type: 'Credit',
      country: 'India',
      bank: 'Unknown',
      valid: true,
      source: 'fallback'
    };
  }
  
  // If no match found, still mark as valid but unknown
  return {
    brand: 'Unknown',
    type: 'Credit',
    country: 'Unknown',
    bank: 'Unknown',
    valid: true,
    source: 'fallback'
  };
}
