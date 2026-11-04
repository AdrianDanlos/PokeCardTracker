export type CardCategory = "official" | "promo" | "variant" | "misprint" | "custom";
export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG";
export type CardSourceId = "pokemontcg" | "tcgdex" | "manual";

export interface CardRecord {
  id: string;
  source_id: CardSourceId;
  external_id: string | null;
  set_id: string | null;
  number: string | null;
  name: string;
  rarity: string | null;
  language: string;
  edition: string | null;
  variant: string | null;
  category: CardCategory;
  image_path: string | null;
  image_url: string | null;
  attrs: Record<string, unknown>;
}

export interface SetRecord {
  id: string;
  source_id: CardSourceId;
  external_id: string | null;
  name: string;
  series: string | null;
  language: string;
  release_date: string | null;
  image_path: string | null;
}

export interface CollectionRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_path: string | null;
  goal_count: number | null;
  sort_order: number;
}

export interface CollectionProgressSummary {
  collection_id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_path: string | null;
  goal_count: number | null;
  sort_order: number;
  total_entries: number;
  owned_entries: number;
  owned_percent: number;
}

export interface CollectionEntryWithCard {
  id: string;
  collection_id: string;
  card_id: string;
  position: number;
  slot_label: string | null;
  notes: string | null;
  card: CardRecord & {
    set?: SetRecord | null;
  };
  owned_quantity: number;
  owned_copy: OwnedCopyRecord | null;
}

export interface OwnedCopyRecord {
  id: string;
  user_id: string;
  card_id: string;
  condition: CardCondition;
  language: string | null;
  edition: string | null;
  variant: string | null;
  quantity: number;
  purchase_price: number | null;
  notes: string | null;
}

export interface CardSearchResult {
  externalId: string;
  name: string;
  number: string | null;
  setName: string | null;
  setExternalId: string | null;
  rarity: string | null;
  language: string;
  imageUrl: string | null;
  category: CardCategory;
  edition: string | null;
  variant: string | null;
  raw?: Record<string, unknown>;
}

export interface ProgressBreakdown {
  by_rarity: Record<string, { total: number; owned: number }>;
  by_set: Record<string, { total: number; owned: number }>;
  by_category: Record<string, { total: number; owned: number }>;
}
