import { createClient } from "@/lib/supabase/client";
import type {
  CollectionEntryWithCard,
  CollectionProgressSummary,
  OwnedCopyRecord,
  ProgressBreakdown,
} from "@/lib/types";

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

function sumOwnedQuantity(copies: OwnedCopyRecord[]) {
  return copies.reduce((n, c) => n + c.quantity, 0);
}

export async function getCollectionEntries(collectionId: string, userId: string, search?: string) {
  const supabase = createClient();

  let cardIdsFilter: string[] | null = null;
  const q = search?.trim();
  if (q) {
    const { data: cards } = await supabase
      .from("cards")
      .select("id")
      .or(`name.ilike.%${q}%,number.ilike.%${q}%`)
      .limit(500);
    cardIdsFilter = (cards ?? []).map((c) => c.id);
    if (cardIdsFilter.length === 0) return [] as CollectionEntryWithCard[];
  }

  let query = supabase
    .from("collection_entries")
    .select(
      `
        id, collection_id, card_id, position, slot_label, notes,
        card:cards (
          id, source_id, external_id, set_id, number, name, rarity, language,
          edition, variant, category, image_path, image_url, attrs,
          set:sets ( id, source_id, external_id, name, series, language, release_date, image_path )
        )
      `,
    )
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  if (cardIdsFilter) query = query.in("card_id", cardIdsFilter);

  const { data: entries, error } = await query;
  if (error) throw error;
  if (!entries?.length) return [] as CollectionEntryWithCard[];

  const cardIds = entries.map((e) => e.card_id);
  const { data: owned } = await supabase
    .from("owned_copies")
    .select("*")
    .eq("user_id", userId)
    .in("card_id", cardIds);

  const ownedByCard = new Map<string, OwnedCopyRecord[]>();
  for (const row of owned ?? []) {
    const list = ownedByCard.get(row.card_id) ?? [];
    list.push(row as OwnedCopyRecord);
    ownedByCard.set(row.card_id, list);
  }

  return entries.map((entry) => {
    const copies = ownedByCard.get(entry.card_id) ?? [];
    const row = entry as unknown as Omit<CollectionEntryWithCard, "owned_copies" | "owned_quantity" | "owned_copy"> & {
      card: CollectionEntryWithCard["card"];
    };
    return {
      ...row,
      owned_copies: copies,
      owned_quantity: sumOwnedQuantity(copies),
      owned_copy: copies[0] ?? null,
    } satisfies CollectionEntryWithCard;
  });
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

export async function getProgressBreakdown(collectionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("collection_progress_breakdown", {
    p_collection_id: collectionId,
  });
  if (error) throw error;
  return data as ProgressBreakdown;
}
