import { createClient } from "@/lib/supabase/client";
import { listCollections } from "@/lib/data/collections";
import type { CollectionProgressSummary } from "@/lib/types";

/** Hosted DB set ids (Gym Heroes, Leader's Stadium). */
const GYM_HEROES_SET_ID = "5d9f8afd-472d-4016-8e4f-6caab2405339";
const LEADERS_STADIUM_SET_ID = "196e3c64-357e-4d3c-a980-7a990ec00b0b";

type SampleCollection = {
  name: string;
  description: string;
  sort_order: number;
  setId: string;
  cardLimit: number;
  ownedCount: number;
};

const SAMPLES: SampleCollection[] = [
  {
    name: "Dev sample — Gym Heroes",
    description: "Sample binder for local guest dev (18 slots, partial progress).",
    sort_order: 0,
    setId: GYM_HEROES_SET_ID,
    cardLimit: 18,
    ownedCount: 8,
  },
  {
    name: "Dev sample — Leader's Stadium",
    description: "Smaller sample collection for quick UI checks.",
    sort_order: 1,
    setId: LEADERS_STADIUM_SET_ID,
    cardLimit: 6,
    ownedCount: 3,
  },
];

export async function seedGuestSampleData(userId: string): Promise<void> {
  const supabase = createClient();

  const { count, error: countError } = await supabase
    .from("collections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw new Error(countError.message);
  if (count && count > 0) {
    throw new Error("This account already has collections. Delete them first or use a fresh guest session.");
  }

  for (const sample of SAMPLES) {
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id")
      .eq("set_id", sample.setId)
      .order("name", { ascending: true })
      .limit(sample.cardLimit);
    if (cardsError) throw new Error(cardsError.message);
    if (!cards?.length) {
      throw new Error(`No cards found for set ${sample.setId}`);
    }

    const { data: collection, error: colError } = await supabase
      .from("collections")
      .insert({
        user_id: userId,
        name: sample.name,
        description: sample.description,
        sort_order: sample.sort_order,
      })
      .select("id")
      .single();
    if (colError || !collection) throw new Error(colError?.message ?? "Could not create collection");

    const entries = cards.map((card, position) => ({
      collection_id: collection.id,
      card_id: card.id,
      position,
    }));
    const { error: entriesError } = await supabase.from("collection_entries").insert(entries);
    if (entriesError) throw new Error(entriesError.message);

    const ownedCards = cards.slice(0, Math.min(sample.ownedCount, cards.length));
    if (ownedCards.length > 0) {
      const { error: ownedError } = await supabase.from("owned_copies").insert(
        ownedCards.map((card) => ({
          user_id: userId,
          card_id: card.id,
          language: "jp",
        })),
      );
      if (ownedError) throw new Error(ownedError.message);
    }
  }
}

export async function seedGuestSampleDataForCurrentUser(): Promise<CollectionProgressSummary[]> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userData.user) throw new Error("Not signed in");

  await seedGuestSampleData(userData.user.id);
  return listCollections(userData.user.id);
}
