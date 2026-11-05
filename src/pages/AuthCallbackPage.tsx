import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

export function AuthCallbackPage() {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setFailed(true);
        return;
      }
      setDone(true);
    });
  }, []);

  if (failed) {
    return (
      <p className="text-center text-red-400">
        Could not complete sign-in. Request a new magic link from the login page.
      </p>
    );
  }
  if (done) return <Navigate to="/" replace />;
  return <p className="text-center text-muted">Signing you in…</p>;
}
