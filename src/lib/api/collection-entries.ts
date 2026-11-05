import { createClient } from "@/lib/supabase/client";

export async function removeEntryFromCollection(entryId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("collection_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
}

export async function reorderCollectionEntries(updates: { id: string; position: number }[]) {
  if (updates.length === 0) return;
  const supabase = createClient();
  const results = await Promise.all(
    updates.map(({ id, position }) =>
      supabase.from("collection_entries").update({ position }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
