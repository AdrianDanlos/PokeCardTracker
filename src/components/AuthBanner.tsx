import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isUsingLocalSupabaseDefaults } from "@/lib/env";

export async function AuthBanner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const local = isUsingLocalSupabaseDefaults();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
      <span className="text-muted">
        {data.user ? `Signed in as ${data.user.email}` : "Not signed in"}
        {local && " · using local Supabase defaults"}
      </span>
      {!data.user && (
        <Link href="/login" className="text-accent hover:underline">
          Magic link login
        </Link>
      )}
    </div>
  );
}
