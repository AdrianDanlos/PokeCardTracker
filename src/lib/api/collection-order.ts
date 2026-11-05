import { createManualCard } from "@/lib/api/cards";
import type { CollectionOrderRow } from "@/lib/collection-order-json";
import { createClient } from "@/lib/supabase/client";
import type { CollectionEntryWithCard } from "@/lib/types";

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export async function applyCollectionOrderImport(params: {
  collectionId: string;
  collectionName: string;
  rows: CollectionOrderRow[];
  existingEntries: CollectionEntryWithCard[];
}) {
  const { collectionId, collectionName, rows, existingEntries } = params;
  if (rows.length === 0) return;

  const sorted = [...rows].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  const poolByName = new Map<string, CollectionEntryWithCard[]>();
  for (const entry of existingEntries) {
    const key = normalizeName(entry.card.name);
    const list = poolByName.get(key) ?? [];
    list.push(entry);
    poolByName.set(key, list);
  }

  const orderedEntryIds: string[] = [];
  const used = new Set<string>();

  for (const row of sorted) {
    const key = normalizeName(row.name);
    const pool = poolByName.get(key)?.filter((e) => !used.has(e.id)) ?? [];
    if (pool.length > 0) {
      used.add(pool[0].id);
      orderedEntryIds.push(pool[0].id);
      continue;
    }

    const entryId = await createManualCard({
      collectionId,
      name: row.name.trim(),
      setName: collectionName,
    });
    used.add(entryId);
    orderedEntryIds.push(entryId);
  }

  const remaining = [...existingEntries]
    .filter((e) => !used.has(e.id))
    .sort((a, b) => a.position - b.position);
  for (const entry of remaining) {
    orderedEntryIds.push(entry.id);
  }

  const supabase = createClient();
  const updates = orderedEntryIds.map((id, position) =>
    supabase.from("collection_entries").update({ position }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
