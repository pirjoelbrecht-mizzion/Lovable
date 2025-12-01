import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const OURA_CLIENT_ID = Deno.env.get("OURA_CLIENT_ID");
    const REDIRECT_URI = `${new URL(req.url).origin}/functions/v1/oura-oauth-callback`;

    if (!OURA_CLIENT_ID) {
      throw new Error("OURA_CLIENT_ID not configured");
    }

    const authUrl = new URL("https://cloud.ouraring.com/oauth/authorize");
    authUrl.searchParams.set("client_id", OURA_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "daily personal");

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
    return new Response(
      JSON.stringify({ error: error.message }),
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