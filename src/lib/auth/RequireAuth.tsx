import { Navigate, useLocation } from "react-router-dom";
import { isLocalDevGuestMode } from "@/lib/auth/devGuest";
import { useAuth } from "@/lib/auth/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="text-muted">Loading…</p>;
  }

  if (!user) {
    if (isLocalDevGuestMode()) {
      return (
        <p className="text-red-400">
          Dev guest sign-in failed. Enable Anonymous sign-ins in Supabase → Authentication →
          Providers.
        </p>
      );
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
