import type { CollectionEntryWithCard, CollectionProgressSummary } from "@/lib/types";

/** Static demo used when Supabase is unreachable (local dev preview / build). */
export const DEMO_COLLECTIONS: CollectionProgressSummary[] = [
  {
    collection_id: "demo-gym",
    user_id: "demo",
    name: "Gym Heroes & Challenge",
    description: "Classic gym leader cards",
    cover_image_path: null,
    sort_order: 0,
    total_entries: 10,
    owned_entries: 6,
    owned_percent: 60,
  },
  {
    collection_id: "demo-neo",
    user_id: "demo",
    name: "Neo Genesis binder",
    description: "One set plus variants and promos",
    cover_image_path: null,
    goal_count: 111,
    sort_order: 1,
    total_entries: 0,
    owned_entries: 0,
    owned_percent: 0,
  },
  {
    collection_id: "demo-dex",
    user_id: "demo",
    name: "Original 151",
    description: "Base set completion",
    goal_count: 151,
    sort_order: 2,
    total_entries: 0,
    owned_entries: 0,
    owned_percent: 0,
  },
  {
    collection_id: "demo-vending",
    user_id: "demo",
    name: "Vending and Carddass variants",
    description: "Obscure JP promos",
    goal_count: null,
    sort_order: 3,
    total_entries: 0,
    owned_entries: 0,
    owned_percent: 0,
  },
];

const card = (
  id: string,
  name: string,
  setName: string,
): CollectionEntryWithCard["card"] => ({
  id,
  source_id: "manual",
  external_id: id,
  set_id: null,
  name,
  language: "jp",
  image_path: null,
  image_url: null,
  attrs: {},
  set: {
    id: "set",
    source_id: "manual",
    external_id: setName,
    name: setName,
    series: null,
    language: "jp",
    release_date: null,
    image_path: null,
  },
});

function demoEntry(
  id: string,
  cardId: string,
  position: number,
  name: string,
  setName: string,
  owned: boolean,
): CollectionEntryWithCard {
  return {
    id,
    collection_id: "demo-gym",
    card_id: cardId,
    position,
    card: card(cardId, name, setName),
    owned,
    owned_language: owned ? "jp" : null,
  };
}

export const DEMO_GYM_ENTRIES: CollectionEntryWithCard[] = [
  demoEntry("e1", "c1", 0, "Blaine's Charizard", "Gym Challenge", true),
  demoEntry("e2", "c2", 1, "Sabrina's Alakazam", "Gym Heroes", true),
  demoEntry("e3", "c3", 2, "Lt. Surge's Raichu", "Gym Challenge", true),
  demoEntry("e4", "c4", 3, "Brock's Onix", "Gym Heroes", true),
  demoEntry("e5", "c5", 4, "Rocket's Mewtwo", "Gym Challenge", true),
  demoEntry("e6", "c6", 5, "Pikachu stamp", "Promo", true),
  demoEntry("e7", "c7", 6, "Misty's Starmie", "Gym Heroes", false),
  demoEntry("e8", "c8", 7, "Giovanni's Nidoking", "Gym Heroes", false),
  demoEntry("e9", "c9", 8, "Erika's Venusaur", "Gym Heroes", false),
  demoEntry("e10", "c10", 9, "Koga's Ninja Trick", "Gym Heroes", false),
];
