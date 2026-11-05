/** Local dev: skip magic link; use Supabase anonymous auth instead. */
export function isLocalDevGuestMode() {
  return import.meta.env.DEV;
}
