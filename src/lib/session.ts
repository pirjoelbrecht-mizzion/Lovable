// src/lib/session.ts
import { save, load, clear } from "@/utils/storage";

export type DemoUser = {
  id: string;
  email: string;
  name?: string;
  createdAt: string; // ISO
};

const KEY = "demoUser";

export function getUser(): DemoUser | null {
  return load<DemoUser | null>(KEY, null);
}

export function signIn(email: string): DemoUser {
  // Clear any previous user's data before signing in
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }

  const user: DemoUser = {
    id: `u_${Math.random().toString(36).slice(2)}`,
    email,
    name: email.split("@")[0],
    createdAt: new Date().toISOString(),
  };
  save(KEY, user);
  return user;
}

export function signOut() {
  // CRITICAL: Clear all localStorage to prevent data leakage between users
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
}
