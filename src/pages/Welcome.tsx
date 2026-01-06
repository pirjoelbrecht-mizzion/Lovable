import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    console.log('Welcome component mounted, supabase:', supabase);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (!supabase) {
        console.log('No supabase client available');
        setChecking(false);
        return;
      }

      console.log('Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session);
      if (session) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        console.log('Welcome checkAuth - Profile:', profile, 'Error:', profileError);

        if (!profile || !profile.onboarding_completed) {
          console.log('Redirecting to onboarding from Welcome');
          navigate('/onboarding', { replace: true });
        } else {
          console.log('Redirecting to quest from Welcome');
          navigate('/quest', { replace: true });
        }
      } else {
        setChecking(false);
      }
    } catch (error) {
      console.error('Welcome checkAuth error:', error);
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050a14', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏃</div>
          <p style={{ fontSize: 16, color: '#ffffff' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: '#050a14',
    }}>
      <div style={{ maxWidth: 600, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>🏃‍♂️</div>

        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#ffffff' }}>
          Mizzion
        </h1>

        <p style={{ fontSize: 20, color: '#94a3b8', marginBottom: 40, lineHeight: 1.6 }}>
          Your AI-powered running coach. Personalized training plans, smart adaptations, and community support for every runner.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
          <button
            className="btn primary"
            onClick={() => navigate('/auth')}
            style={{ padding: '16px 32px', fontSize: 16, fontWeight: 600 }}
          >
            Get Started
          </button>
          <button
            className="btn"
            onClick={() => navigate('/auth')}
            style={{ padding: '16px 32px', fontSize: 16 }}
          >
            Sign In
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 24,
          marginTop: 60,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
            <h3 style={{ fontSize: 16, marginBottom: 4, color: '#ffffff' }}>Quest Mode</h3>
            <p className="small" style={{ opacity: 0.7, color: '#94a3b8' }}>
              Gamified weekly training bubbles
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <h3 style={{ fontSize: 16, marginBottom: 4, color: '#ffffff' }}>Smart Analytics</h3>
            <p className="small" style={{ opacity: 0.7, color: '#94a3b8' }}>
              Track progress and insights
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
            <h3 style={{ fontSize: 16, marginBottom: 4, color: '#ffffff' }}>Unity</h3>
            <p className="small" style={{ opacity: 0.7, color: '#94a3b8' }}>
              Find running companions
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
            <h3 style={{ fontSize: 16, marginBottom: 4, color: '#ffffff' }}>AI Coach</h3>
            <p className="small" style={{ opacity: 0.7, color: '#94a3b8' }}>
              Personalized training advice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
