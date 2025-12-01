import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const SUUNTO_CLIENT_SECRET = Deno.env.get("SUUNTO_CLIENT_SECRET");
    const SUUNTO_SUBSCRIPTION_KEY = Deno.env.get("SUUNTO_SUBSCRIPTION_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      throw new Error("No authorization code provided");
    }

    if (!SUUNTO_CLIENT_ID || !SUUNTO_CLIENT_SECRET || !SUUNTO_SUBSCRIPTION_KEY) {
      throw new Error("Suunto credentials not configured");
    }

    const origin = new URL(req.url).origin;
    const REDIRECT_URI = `${origin}/functions/v1/suunto-oauth-callback`;

    const tokenResponse = await fetch("https://cloudapi.suunto.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Ocp-Apim-Subscription-Key": SUUNTO_SUBSCRIPTION_KEY,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: SUUNTO_CLIENT_ID,
        client_secret: SUUNTO_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Suunto token error:", errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Failed to get user");
    }

    const { error: insertError } = await supabase
      .from("wearable_connections")
      .upsert({
        user_id: user.id,
        provider: "suunto",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error saving Suunto connection:", insertError);
      throw new Error("Failed to save connection");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Suunto OAuth callback error:", message);
    return new Response(
      JSON.stringify({ error: message }),
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
