import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    console.log('Token length:', token.length);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log('User lookup:', { userId: user?.id, error: userError?.message });

    if (userError || !user) {
      console.error('Invalid authentication token:', userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const STRAVA_CLIENT_ID = "185151";
    const origin = new URL(req.url).origin.replace('http://', 'https://');
    const REDIRECT_URI = `${origin}/functions/v1/strava-oauth-callback`;

    const state = btoa(JSON.stringify({ userId: user.id }));

    const authUrl = new URL("https://www.strava.com/oauth/authorize");
    authUrl.searchParams.set("client_id", STRAVA_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("approval_prompt", "auto");
    authUrl.searchParams.set("scope", "activity:read_all,profile:read_all");
    authUrl.searchParams.set("state", state);

    console.log('Generated auth URL:', authUrl.toString());
    console.log('Redirect URI:', REDIRECT_URI);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Strava OAuth start error:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});