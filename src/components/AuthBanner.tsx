import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AuthBanner() {
  const { user, loading } = useAuth();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
      <span className="text-muted">
        {loading ? "Checking session…" : user ? `Signed in as ${user.email}` : "Not signed in"}
      </span>
      {!user && !loading && (
        <Link to="/login" className="text-accent hover:underline">
          Magic link login
        </Link>
      )}
    </div>
  );
}
