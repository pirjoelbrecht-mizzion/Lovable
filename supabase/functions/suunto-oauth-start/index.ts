import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUUNTO_CLIENT_ID = Deno.env.get("SUUNTO_CLIENT_ID");
    const SUUNTO_SUBSCRIPTION_KEY = Deno.env.get("SUUNTO_SUBSCRIPTION_KEY");

    if (!SUUNTO_CLIENT_ID) {
      throw new Error("SUUNTO_CLIENT_ID not configured");
    }

    if (!SUUNTO_SUBSCRIPTION_KEY) {
      throw new Error("SUUNTO_SUBSCRIPTION_KEY not configured");
    }

    const url = new URL(req.url);
    const frontendOrigin = url.searchParams.get("origin") || url.origin;
    const REDIRECT_URI = `${frontendOrigin}/auth/callback/suunto`;

    const authUrl = new URL("https://cloudapi-oauth.suunto.com/oauth/authorize");
    authUrl.searchParams.set("client_id", SUUNTO_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "workout");

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});