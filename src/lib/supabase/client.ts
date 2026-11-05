import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

let client: SupabaseClient | null = null;

export function createClient() {
  if (!client) {
    client = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    });
  }
  return client;
}
