import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { completeAuthFromUrl } from "@/lib/auth/completeAuthFromUrl";
import { createClient } from "@/lib/supabase/client";

export function AuthCallbackPage() {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function run() {
      try {
        await completeAuthFromUrl(supabase);
        if (!cancelled) setDone(true);
      } catch {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
            if (!cancelled) setDone(true);
          }
        });
        const { data } = await supabase.auth.getSession();
        if (data.session && !cancelled) {
          setDone(true);
          subscription.unsubscribe();
          return;
        }
        window.setTimeout(async () => {
          const retry = await supabase.auth.getSession();
          if (!cancelled) {
            if (retry.data.session) setDone(true);
            else setFailed(true);
          }
          subscription.unsubscribe();
        }, 2500);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (done) return <Navigate to="/" replace />;
  if (failed) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-red-400">
          Could not complete sign-in. Request a new magic link and open it in the same browser you used
          to send the email.
        </p>
        <Link to="/login" className="btn-primary inline-block">
          Back to login
        </Link>
      </div>
    );
  }
  return <p className="text-center text-muted">Signing you in…</p>;
}
