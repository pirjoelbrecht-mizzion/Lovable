import { useEffect, useState } from "react";
import { getUser, signOut, signIn, type DemoUser } from "@/lib/session";

/** Reads the demo user from localStorage and updates on tab changes. */
export default function useSession() {
  const [user, setUser] = useState<DemoUser | null>(() => getUser());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "demoUser") setUser(getUser());
    };
    const onVis = () => setUser(getUser());

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { user, signOut, signIn, refresh: () => setUser(getUser()) };
}
