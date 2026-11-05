import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-xl border border-border bg-surface p-8">
      <div>
        <h1 className="text-2xl font-bold">Magic link login</h1>
        <p className="mt-2 text-sm text-muted">Single-user access to your PokeCardTracker collections.</p>
      </div>
      {sent ? (
        <p className="text-sm text-accent">Check your email for the sign-in link.</p>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
      <Link to="/" className="text-sm text-muted hover:text-accent">
        ← Back to dashboard
      </Link>
    </div>
  );
}
