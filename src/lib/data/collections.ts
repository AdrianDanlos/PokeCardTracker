import { DEMO_COLLECTIONS, DEMO_BREAKDOWN, DEMO_GYM_ENTRIES } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type {
  CollectionEntryWithCard,
  CollectionProgressSummary,
  ProgressBreakdown,
} from "@/lib/types";

export async function listCollections(): Promise<{
  collections: CollectionProgressSummary[];
  demo: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { collections: DEMO_COLLECTIONS, demo: true };
    }
    const { data, error } = await supabase
      .from("collection_progress_summary")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("sort_order", { ascending: true });
    if (error || !data?.length) {
      if (error) console.warn("listCollections", error.message);
      return { collections: DEMO_COLLECTIONS, demo: true };
    }
    return { collections: data as CollectionProgressSummary[], demo: false };
  } catch {
    return { collections: DEMO_COLLECTIONS, demo: true };
  }
}

export async function getCollectionEntries(
  collectionId: string,
): Promise<{ entries: CollectionEntryWithCard[]; demo: boolean }> {
  if (collectionId.startsWith("demo-")) {
    return { entries: DEMO_GYM_ENTRIES, demo: true };
  }
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { entries: DEMO_GYM_ENTRIES, demo: true };

    const { data: entries, error } = await supabase
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

    if (error || !entries) {
      console.warn("getCollectionEntries", error?.message);
      return { entries: DEMO_GYM_ENTRIES, demo: true };
    }

    const cardIds = entries.map((e) => e.card_id);
    const { data: owned } = await supabase
      .from("owned_copies")
      .select("*")
      .eq("user_id", userData.user.id)
      .in("card_id", cardIds);

    const ownedMap = new Map((owned ?? []).map((o) => [o.card_id, o]));

    const mapped: CollectionEntryWithCard[] = entries.map((e) => {
      const copy = ownedMap.get(e.card_id);
      const cardRaw = e.card as unknown as CollectionEntryWithCard["card"];
      return {
        id: e.id,
        collection_id: e.collection_id,
        card_id: e.card_id,
        position: e.position,
        slot_label: e.slot_label,
        notes: e.notes,
        card: cardRaw,
        owned_quantity: copy?.quantity ?? 0,
        owned_copy: copy ?? null,
      };
    });

    return { entries: mapped, demo: false };
  } catch {
    return { entries: DEMO_GYM_ENTRIES, demo: true };
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
