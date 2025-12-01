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
    const COROS_CLIENT_ID = Deno.env.get("COROS_CLIENT_ID");
    const origin = new URL(req.url).origin;
    const REDIRECT_URI = `${origin}/functions/v1/coros-oauth-callback`;

    if (!COROS_CLIENT_ID) {
      throw new Error("COROS_CLIENT_ID not configured");
    }

    const authUrl = new URL("https://open.coros.com/oauth/authorize");
    authUrl.searchParams.set("client_id", COROS_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "read_hr read_sleep read_recovery");

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