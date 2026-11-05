const DEV_CALLBACK = "http://localhost:5173/auth/callback";

/**
 * Where Supabase should send the user after clicking the magic link.
 * Must be listed in Supabase Dashboard → Authentication → URL configuration → Redirect URLs.
 */
export function getAuthRedirectUrl(): string {
  if (import.meta.env.DEV) {
    return DEV_CALLBACK;
  }
  const fromEnv = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `${window.location.origin.replace(/\/$/, "")}/auth/callback`;
}

export function getAuthRedirectUrlForDisplay() {
  return getAuthRedirectUrl();
}
