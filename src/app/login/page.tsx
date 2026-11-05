"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (authError) setError(authError.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-12">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-sm text-muted">We&apos;ll email you a magic link (single-user app).</p>
      {sent ? (
        <p className="text-accent">Check your email for the login link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Send magic link
          </button>
        </form>
      )}
    </div>
  );
}
