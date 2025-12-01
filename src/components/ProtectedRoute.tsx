import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useSession from "@/hooks/useSession";

/** Wrap protected pages with this. Redirects to /auth if not signed in. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const loc = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ redirectTo: loc.pathname }} />;
  }
  return <>{children}</>;
}
