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
    const GARMIN_CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID");
    const REDIRECT_URI = `${new URL(req.url).origin}/api/garmin/oauth/callback`;

    if (!GARMIN_CLIENT_ID) {
      throw new Error("GARMIN_CLIENT_ID not configured");
    }

    const authUrl = new URL("https://connect.garmin.com/oauthConfirm");
    authUrl.searchParams.set("oauth_consumer_key", GARMIN_CLIENT_ID);
    authUrl.searchParams.set("oauth_callback", REDIRECT_URI);

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