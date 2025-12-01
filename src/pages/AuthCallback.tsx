import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { syncLogEntries } from "@/lib/database";

export default function AuthCallback() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        setError(error.message);
        setTimeout(() => nav("/auth"), 2000);
        return;
      }

      if (data.session) {
        syncLogEntries().catch(err => {
          console.error('Failed to sync log entries on login:', err);
        });

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        console.log('AuthCallback - Profile:', profile, 'Error:', profileError);

        if (!profile || !profile.onboarding_completed) {
          console.log('Redirecting to onboarding - no profile or not completed');
          nav("/onboarding", { replace: true });
        } else {
          console.log('Onboarding completed, redirecting to quest');
          nav("/quest", { replace: true });
        }
      } else {
        nav("/auth", { replace: true });
      }
    } catch (err: any) {
      console.error('Callback error:', err);
      setError(err.message);
      setTimeout(() => nav("/auth"), 2000);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "60px auto", textAlign: 'center' }}>
      {error ? (
        <>
          <h2 className="h2" style={{ color: '#ef4444' }}>Authentication Error</h2>
          <p className="small" style={{ marginTop: 12 }}>{error}</p>
          <p className="small" style={{ marginTop: 8, opacity: 0.7 }}>
            Redirecting to sign in...
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏃</div>
          <h2 className="h2">Completing sign in...</h2>
          <p className="small" style={{ marginTop: 12, opacity: 0.7 }}>
            Please wait while we set up your account
          </p>
        </>
      )}
    </div>
  );
}
