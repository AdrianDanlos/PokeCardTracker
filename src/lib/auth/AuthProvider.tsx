import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isLocalDevGuestMode } from "@/lib/auth/devGuest";
import { createClient } from "@/lib/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isDevGuest: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  isDevGuest: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setSession(data.session);
        setLoading(false);
        return;
      }
      if (isLocalDevGuestMode()) {
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (!cancelled) {
          if (!error && anon.session) setSession(anon.session);
          setLoading(false);
        }
        return;
      }
      setLoading(false);
    }

    void ensureSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const user = session?.user ?? null;
  const isDevGuest = isLocalDevGuestMode() && (user?.is_anonymous ?? false);

  const value = useMemo(
    () => ({ session, user, loading, isDevGuest }),
    [session, user, loading, isDevGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
