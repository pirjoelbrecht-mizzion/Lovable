import { createClient } from 'npm:@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RefreshRequest {
  connectionId: string;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { connectionId }: RefreshRequest = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing connectionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: prepData, error: prepError } = await supabaseUser
      .rpc('refresh_strava_token', { connection_id: connectionId });

    if (prepError || !prepData?.success) {
      return new Response(
        JSON.stringify({ error: prepData?.error || 'Failed to prepare token refresh' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stravaResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: prepData.client_id,
        client_secret: prepData.client_secret,
        grant_type: 'refresh_token',
        refresh_token: prepData.refresh_token,
      }),
    });

    if (!stravaResponse.ok) {
      const errorText = await stravaResponse.text();
      console.error('Strava token refresh failed:', errorText);

      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseService
        .from('wearable_connections')
        .update({ connection_status: 'token_expired' })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ error: 'Strava token refresh failed', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData: StravaTokenResponse = await stravaResponse.json();

    const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

    const { data: updateData, error: updateError } = await supabaseUser
      .rpc('update_connection_tokens', {
        connection_id: connectionId,
        new_access_token: tokenData.access_token,
        new_refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      });

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save refreshed tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt: expiresAt,
        expiresIn: tokenData.expires_in,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});