import { DEMO_COLLECTIONS, DEMO_BREAKDOWN, DEMO_GYM_ENTRIES } from "@/lib/demo-data";
import { isProductionSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  CollectionEntryWithCard,
  CollectionProgressSummary,
  OwnedCopyRecord,
  ProgressBreakdown,
} from "@/lib/types";

export type ListCollectionsResult = {
  collections: CollectionProgressSummary[];
  demo: boolean;
  requiresAuth: boolean;
};

export async function listCollections(): Promise<ListCollectionsResult> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      if (isProductionSupabaseConfigured()) {
        return { collections: [], demo: false, requiresAuth: true };
      }
      return { collections: DEMO_COLLECTIONS, demo: true, requiresAuth: false };
    }
    const { data, error } = await supabase
      .from("collection_progress_summary")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("sort_order", { ascending: true });
    if (error || !data?.length) {
      if (error) console.warn("listCollections", error.message);
      if (isProductionSupabaseConfigured()) {
        return { collections: (data as CollectionProgressSummary[]) ?? [], demo: false, requiresAuth: false };
      }
      return { collections: DEMO_COLLECTIONS, demo: true, requiresAuth: false };
    }
    return { collections: data as CollectionProgressSummary[], demo: false, requiresAuth: false };
  } catch {
    if (isProductionSupabaseConfigured()) {
      return { collections: [], demo: false, requiresAuth: true };
    }
    return { collections: DEMO_COLLECTIONS, demo: true, requiresAuth: false };
  }
}

function sumOwnedQuantity(copies: OwnedCopyRecord[]) {
  return copies.reduce((n, c) => n + c.quantity, 0);
}

export async function getCollectionEntries(
  collectionId: string,
  options?: { search?: string },
): Promise<{ entries: CollectionEntryWithCard[]; demo: boolean; requiresAuth: boolean }> {
  if (collectionId.startsWith("demo-")) {
    return { entries: DEMO_GYM_ENTRIES, demo: true, requiresAuth: false };
  }
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      if (isProductionSupabaseConfigured()) {
        return { entries: [], demo: false, requiresAuth: true };
      }
      return { entries: DEMO_GYM_ENTRIES, demo: true, requiresAuth: false };
    }

    let cardIdsFilter: string[] | null = null;
    const search = options?.search?.trim();
    if (search) {
      const { data: cards } = await supabase
        .from("cards")
        .select("id")
        .or(`name.ilike.%${search}%,number.ilike.%${search}%`)
        .limit(500);
      cardIdsFilter = (cards ?? []).map((c) => c.id);
      if (cardIdsFilter.length === 0) {
        return { entries: [], demo: false, requiresAuth: false };
      }
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

    if (cardIdsFilter) {
      query = query.in("card_id", cardIdsFilter);
    }

    const { data: entries, error } = await query;

    if (error || !entries) {
      console.warn("getCollectionEntries", error?.message);
      if (isProductionSupabaseConfigured()) {
        return { entries: [], demo: false, requiresAuth: false };
      }
      return { entries: DEMO_GYM_ENTRIES, demo: true, requiresAuth: false };
    }

    const cardIds = entries.map((e) => e.card_id);
    const { data: owned } = await supabase
      .from("owned_copies")
      .select("*")
      .eq("user_id", userData.user.id)
      .in("card_id", cardIds);

    const ownedByCard = new Map<string, OwnedCopyRecord[]>();
    for (const row of owned ?? []) {
      const list = ownedByCard.get(row.card_id) ?? [];
      list.push(row as OwnedCopyRecord);
      ownedByCard.set(row.card_id, list);
    }

    const mapped: CollectionEntryWithCard[] = entries.map((e) => {
      const copies = ownedByCard.get(e.card_id) ?? [];
      const cardRaw = e.card as unknown as CollectionEntryWithCard["card"];
      const qty = sumOwnedQuantity(copies);
      return {
        id: e.id,
        collection_id: e.collection_id,
        card_id: e.card_id,
        position: e.position,
        slot_label: e.slot_label,
        notes: e.notes,
        card: cardRaw,
        owned_quantity: qty,
        owned_copies: copies,
        owned_copy: copies[0] ?? null,
      };
    });

    return { entries: mapped, demo: false, requiresAuth: false };
  } catch {
    if (isProductionSupabaseConfigured()) {
      return { entries: [], demo: false, requiresAuth: true };
    }
    return { entries: DEMO_GYM_ENTRIES, demo: true, requiresAuth: false };
  }
}

export async function getCollectionMeta(collectionId: string) {
  if (collectionId.startsWith("demo-")) {
    return DEMO_COLLECTIONS.find((c) => c.collection_id === collectionId) ?? DEMO_COLLECTIONS[0];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("collection_progress_summary")
    .select("*")
    .eq("collection_id", collectionId)
    .maybeSingle();
  return (data as CollectionProgressSummary | null) ?? DEMO_COLLECTIONS[0];
}

export async function getProgressBreakdown(
  collectionId: string,
): Promise<ProgressBreakdown> {
  if (collectionId.startsWith("demo-")) return DEMO_BREAKDOWN;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("collection_progress_breakdown", {
      p_collection_id: collectionId,
    });
    if (error || !data) return DEMO_BREAKDOWN;
    return data as ProgressBreakdown;
  } catch {
    return DEMO_BREAKDOWN;
  }
}
