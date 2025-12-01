import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ToastHost";

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const loc = useLocation() as any;
  const redirectTo = loc.state?.redirectTo || "/quest";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.includes("@")) {
      toast("Enter a valid email address", "error");
      return;
    }

    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });

        if (error) {
          toast(error.message, "error");
        } else if (data.user) {
          // Clear localStorage after successful signup, preserving auth session
          const authKeys = Object.keys(localStorage).filter(key =>
            key.startsWith('sb-') || key.includes('supabase')
          );
          const authData: Record<string, string> = {};
          authKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) authData[key] = value;
          });

          try {
            localStorage.clear();
            // Restore auth keys
            Object.entries(authData).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });
          } catch (e) {
            console.error('Failed to clear localStorage:', e);
          }

          if (data.session) {
            toast("Account created successfully!", "success");
            nav("/onboarding");
          } else {
            toast("Account created! Please check your email to verify.", "success");
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast(error.message, "error");
        } else if (data.user) {
          // Clear localStorage AFTER successful authentication but BEFORE querying user data
          // This ensures we don't show previous user's data while preserving the new auth session
          const authKeys = Object.keys(localStorage).filter(key =>
            key.startsWith('sb-') || key.includes('supabase')
          );
          const authData: Record<string, string> = {};
          authKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) authData[key] = value;
          });

          try {
            localStorage.clear();
            // Restore auth keys
            Object.entries(authData).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });
          } catch (e) {
            console.error('Failed to clear localStorage:', e);
          }

          toast("Signed in successfully!", "success");

          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('onboarding_completed')
            .eq('user_id', data.user.id)
            .maybeSingle();

          console.log('Auth check - Profile:', profile, 'Error:', profileError);

          if (!profile || !profile.onboarding_completed) {
            console.log('Redirecting to onboarding - no profile or not completed');
            nav("/onboarding");
          } else {
            console.log('Onboarding completed, redirecting to:', redirectTo);
            nav(redirectTo, { replace: true });
          }
        }
      }
    } catch (err: any) {
      toast(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: "60px auto" }}>
      <h1 className="h2" style={{ marginBottom: 8 }}>
        {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
      </h1>
      <p className="small" style={{ color: 'var(--muted)', marginBottom: 24 }}>
        {mode === 'signin'
          ? 'Sign in to access your training plan'
          : 'Start your personalized running journey'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="small" style={{ display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            minLength={6}
            required
          />
          <p className="small" style={{ marginTop: 4, opacity: 0.7 }}>
            At least 6 characters
          </p>
        </div>

        <button
          className="btn primary"
          type="submit"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style={{
        marginTop: 24,
        paddingTop: 24,
        borderTop: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        <p className="small" style={{ color: 'var(--muted)' }}>
          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p className="small" style={{ opacity: 0.7, fontSize: 11 }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
