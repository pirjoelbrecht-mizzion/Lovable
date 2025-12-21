import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useSession from "@/lib/useSession";

/** Wrap protected pages with this. Redirects to /auth if not signed in. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const loc = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ redirectTo: loc.pathname }} />;
  }
  return <>{children}</>;
}
