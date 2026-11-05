import { matchesCollectionEntrySearch } from "@/lib/collection-entry-search";
import { createClient } from "@/lib/supabase/client";
import type { CollectionEntryWithCard, CollectionProgressSummary } from "@/lib/types";

export async function listCollections(userId: string | undefined) {
  if (!userId) return [] as CollectionProgressSummary[];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_progress_summary")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CollectionProgressSummary[];
}

export async function getCollectionEntries(collectionId: string, userId: string, search?: string) {
  const supabase = createClient();

  let query = supabase
    .from("collection_entries")
    .select(
      `
        id, collection_id, card_id, position,
        card:cards (
          id, source_id, external_id, set_id, name, language,
          image_path, image_url, attrs,
          set:sets ( id, source_id, external_id, name, series, language, release_date, image_path )
        )
      `,
    )
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  const { data: entries, error } = await query;
  if (error) throw error;
  if (!entries?.length) return [] as CollectionEntryWithCard[];

  const cardIds = entries.map((e) => e.card_id);
  const { data: owned } = await supabase
    .from("owned_copies")
    .select("card_id, language")
    .eq("user_id", userId)
    .in("card_id", cardIds);

  const ownedByCard = new Map<string, { language: string | null }>();
  for (const row of owned ?? []) {
    ownedByCard.set(row.card_id, { language: row.language as string | null });
  }

  const mapped = entries.map((entry) => {
    const ownedRow = ownedByCard.get(entry.card_id);
    const row = entry as unknown as Omit<CollectionEntryWithCard, "owned" | "owned_language"> & {
      card: CollectionEntryWithCard["card"];
    };
    return {
      ...row,
      owned: ownedRow != null,
      owned_language: ownedRow?.language ?? null,
    } satisfies CollectionEntryWithCard;
  });

  const q = search?.trim();
  if (!q) return mapped;
  return mapped.filter((entry) => matchesCollectionEntrySearch(entry, q));
}

export async function getCollectionSummary(collectionId: string, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_progress_summary")
    .select("*")
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as CollectionProgressSummary | null;
}
