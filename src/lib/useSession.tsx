// src/hooks/useSession.tsx
import { useEffect, useState } from "react";
import { supabase, hasSupabase, type Session, type User } from "@/lib/supabase";

type UseSession = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthed: boolean;
};

export default function useSession(): UseSession {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }

    // initial fetch
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    // subscribe to changes
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);

      // Clear localStorage when user signs out or session ends
      if (event === 'SIGNED_OUT' || (!s && session)) {
        try {
          localStorage.clear();
        } catch (e) {
          console.error('Failed to clear localStorage:', e);
        }
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    isAuthed: Boolean(session),
  };
}
