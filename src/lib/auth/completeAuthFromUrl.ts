import type { SupabaseClient } from "@supabase/supabase-js";

/** Finish magic-link / OAuth redirect (PKCE code or hash tokens). */
export async function completeAuthFromUrl(supabase: SupabaseClient) {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`);
    return;
  }

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`);
    return;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    throw new Error("No session in callback URL");
  }
}
