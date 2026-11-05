import { createClient } from "@/lib/supabase/client";

export async function removeEntryFromCollection(entryId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("collection_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
}
