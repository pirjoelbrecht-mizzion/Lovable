import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(supabaseUrl && supabaseKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

export const supabase = getSupabase();

export async function isAuthed(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data: { session } } = await client.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.auth.signOut();

    // CRITICAL: Clear all localStorage to prevent data leakage between users
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

export function onAuthChange(cb: (session: any | null) => void): () => void {
  const client = getSupabase();
  if (!client) {
    try { cb(null); } catch {}
    return () => {};
  }
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    try { cb(session); } catch {}
  });
  return () => subscription.unsubscribe();
}
