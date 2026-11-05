export function getSupabaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing VITE_SUPABASE_URL. Add it to .env.local or Cursor Cloud Agent secrets.");
  }
  return url;
}

export function getSupabaseAnonKey() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY. Add it to .env.local or Cursor Cloud Agent secrets.",
    );
  }
  return key;
}
