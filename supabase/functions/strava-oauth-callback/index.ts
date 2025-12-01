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
    console.log('Callback URL:', req.url);
    
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    console.log('Code:', code ? 'present' : 'missing');
    console.log('Error param:', error);

    if (error) {
      return new Response(
        `<html><body><h3>Authorization Error</h3><p>${error}</p><script>if(window.opener){window.opener.postMessage({ type: 'strava-error', error: '${error}' }, '*');}setTimeout(() => window.close(), 2000);</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code) {
      return new Response(
        `<html><body><h3>Error</h3><p>No authorization code provided</p><script>if(window.opener){window.opener.postMessage({ type: 'strava-error', error: 'No code' }, '*');}setTimeout(() => window.close(), 2000);</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const STRAVA_CLIENT_ID = "185151";
    const STRAVA_CLIENT_SECRET = "a12e0e8ee2dde9aaed44142c5e548e7754a66047";

    console.log('Exchanging code for token...');

    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return new Response(
        `<html><body><h3>Token Exchange Failed</h3><p>${errorData}</p><script>if(window.opener){window.opener.postMessage({ type: 'strava-error', error: 'Token exchange failed' }, '*');}setTimeout(() => window.close(), 2000);</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token data received:', { hasAccessToken: !!tokenData.access_token, hasRefreshToken: !!tokenData.refresh_token });
    
    const { access_token, refresh_token, expires_at, athlete } = tokenData;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stateParam = url.searchParams.get("state");
    let userId = null;

    if (stateParam) {
      try {
        const stateData = JSON.parse(atob(stateParam));
        userId = stateData.userId;
        console.log('User ID from state:', userId);
      } catch (e) {
        console.error("Failed to parse state:", e);
      }
    }

    if (!userId) {
      console.error('No user ID found in state');
      return new Response(
        `<html><body><h3>Authentication Error</h3><p>User ID missing</p><script>if(window.opener){window.opener.postMessage({ type: 'strava-error', error: 'Authentication required' }, '*');}setTimeout(() => window.close(), 2000);</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const expiresAt = new Date(expires_at * 1000).toISOString();

    console.log('Saving to database...');
    const { data: savedData, error: dbError } = await supabase
      .from("wearable_connections")
      .upsert({
        user_id: userId,
        provider: "strava",
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        connection_status: "connected",
        profile_name: `${athlete.firstname} ${athlete.lastname}`.trim(),
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      })
      .select();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        `<html><body><h3>Database Error</h3><p>${dbError.message}</p><script>if(window.opener){window.opener.postMessage({ type: 'strava-error', error: 'Database error' }, '*');}setTimeout(() => window.close(), 2000);</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    console.log('Successfully saved connection:', savedData);

    console.log('Success! Sending message and closing popup...');
    return new Response(
      `<html>
      <head><title>Success</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h3 style="color: #10b981;">✓ Success!</h3>
        <p>Connected to Strava as ${athlete.firstname} ${athlete.lastname}</p>
        <p style="color: #666; font-size: 14px; margin: 20px 0;">Connection saved! You can close this window.</p>
        <button onclick="window.close()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; margin-top: 12px;">
          Close Window
        </button>
        <script>
          console.log('[Strava Callback] Sending success message to parent...');
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'strava-success',
              athlete: {
                firstname: '${athlete.firstname}',
                lastname: '${athlete.lastname}'
              }
            }, '*');
            console.log('[Strava Callback] Message sent successfully');
          }
          // Try to auto-close (works if opened via window.open)
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
      );
  } catch (error) {
    console.error("Strava OAuth callback error:", error);
    return new Response(
      `<html><body><h3>Unexpected Error</h3><p>${error.message}</p><script>if(window.opener){window.opener.postMessage({ type: 'strava-error', error: '${error.message}' }, '*');}setTimeout(() => window.close(), 2000);</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
});