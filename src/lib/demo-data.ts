import type {
  CollectionEntryWithCard,
  CollectionProgressSummary,
  ProgressBreakdown,
} from "@/lib/types";

/** Static demo used when Supabase is unreachable (local dev preview / build). */
export const DEMO_COLLECTIONS: CollectionProgressSummary[] = [
  {
    collection_id: "demo-gym",
    user_id: "demo",
    name: "Gym Era + Promos",
    description: "Gym Heroes, Gym Challenge, promos, custom cards",
    cover_image_path: null,
    goal_count: 150,
    sort_order: 0,
    total_entries: 196,
    owned_entries: 118,
    owned_percent: 60,
  },
  {
    collection_id: "demo-neo",
    user_id: "demo",
    name: "Neo Genesis (JP)",
    description: "One set plus variants and promos",
    cover_image_path: null,
    goal_count: null,
    sort_order: 1,
    total_entries: 96,
    owned_entries: 64,
    owned_percent: 67,
  },
  {
    collection_id: "demo-dex",
    user_id: "demo",
    name: "Pokédex, one per species",
    description: "Any card of a species counts",
    cover_image_path: null,
    goal_count: null,
    sort_order: 2,
    total_entries: 1025,
    owned_entries: 412,
    owned_percent: 40,
  },
  {
    collection_id: "demo-vending",
    user_id: "demo",
    name: "Vending and Carddass variants",
    description: "Hand-picked, no official set",
    cover_image_path: null,
    goal_count: null,
    sort_order: 3,
    total_entries: 72,
    owned_entries: 23,
    owned_percent: 32,
  },
];

const card = (
  id: string,
  name: string,
  setName: string,
  rarity: string,
  number: string,
): CollectionEntryWithCard["card"] => ({
  id,
  source_id: "manual",
  external_id: id,
  set_id: null,
  number,
  name,
  rarity,
  language: "en",
  edition: null,
  variant: null,
  category: name.includes("stamp") ? "promo" : "official",
  image_path: null,
  image_url: null,
  attrs: {},
  set: {
    id: "set",
    source_id: "manual",
    external_id: setName,
    name: setName,
    series: null,
    language: "en",
    release_date: null,
    image_path: null,
  },
});

export const DEMO_GYM_ENTRIES: CollectionEntryWithCard[] = [
  { id: "e1", collection_id: "demo-gym", card_id: "c1", position: 0, slot_label: null, notes: null, card: card("c1", "Blaine's Charizard", "Gym Challenge", "Holo", "2"), owned_quantity: 1, owned_copy: null },
  { id: "e2", collection_id: "demo-gym", card_id: "c2", position: 1, slot_label: null, notes: null, card: card("c2", "Sabrina's Alakazam", "Gym Heroes", "Holo", "16"), owned_quantity: 2, owned_copy: null },
  { id: "e3", collection_id: "demo-gym", card_id: "c3", position: 2, slot_label: null, notes: null, card: card("c3", "Lt. Surge's Raichu", "Gym Challenge", "Holo", "11"), owned_quantity: 1, owned_copy: null },
  { id: "e4", collection_id: "demo-gym", card_id: "c4", position: 3, slot_label: null, notes: null, card: card("c4", "Brock's Onix", "Gym Heroes", "Non-holo", "69"), owned_quantity: 1, owned_copy: null },
  { id: "e5", collection_id: "demo-gym", card_id: "c5", position: 4, slot_label: null, notes: null, card: card("c5", "Rocket's Mewtwo", "Gym Challenge", "Holo", "14"), owned_quantity: 1, owned_copy: null },
  { id: "e6", collection_id: "demo-gym", card_id: "c6", position: 5, slot_label: null, notes: null, card: card("c6", "Pikachu stamp", "Promo", "Promo", "24"), owned_quantity: 3, owned_copy: null },
  { id: "e7", collection_id: "demo-gym", card_id: "c7", position: 6, slot_label: null, notes: null, card: card("c7", "Misty's Starmie", "Gym Heroes", "Non-holo", "64"), owned_quantity: 0, owned_copy: null },
  { id: "e8", collection_id: "demo-gym", card_id: "c8", position: 7, slot_label: null, notes: null, card: card("c8", "Giovanni's Nidoking", "Gym Heroes", "Non-holo", "48"), owned_quantity: 0, owned_copy: null },
  { id: "e9", collection_id: "demo-gym", card_id: "c9", position: 8, slot_label: null, notes: null, card: card("c9", "Erika's Venusaur", "Gym Heroes", "Holo", "4"), owned_quantity: 0, owned_copy: null },
  { id: "e10", collection_id: "demo-gym", card_id: "c10", position: 9, slot_label: null, notes: null, card: card("c10", "Koga's Ninja Trick", "Gym Heroes", "Non-holo", "24"), owned_quantity: 0, owned_copy: null },
];

export const DEMO_BREAKDOWN: ProgressBreakdown = {
  by_rarity: { Holo: { total: 5, owned: 5 }, "Non-holo": { total: 4, owned: 1 }, Promo: { total: 1, owned: 1 } },
  by_set: { "Gym Heroes": { total: 6, owned: 3 }, "Gym Challenge": { total: 3, owned: 3 }, Promo: { total: 1, owned: 1 } },
  by_category: { official: { total: 9, owned: 6 }, promo: { total: 1, owned: 1 } },
};
