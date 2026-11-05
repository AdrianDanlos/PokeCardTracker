export type CardSourceId = "tcgdex" | "manual";

export const DEFAULT_CARD_LANGUAGE = "jp";

export interface CardRecord {
  id: string;
  source_id: CardSourceId;
  external_id: string | null;
  set_id: string | null;
  name: string;
  language: string;
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
  sort_order: number;
  binder_gaps?: number[];
}

export interface CollectionProgressSummary {
  collection_id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_path: string | null;
  sort_order: number;
  total_entries: number;
  owned_entries: number;
  owned_percent: number;
  binder_gaps?: number[];
}

export interface CollectionEntryWithCard {
  id: string;
  collection_id: string;
  card_id: string;
  position: number;
  card: CardRecord & {
    set?: SetRecord | null;
  };
  owned: boolean;
  owned_language: string | null;
}

export interface CardSearchResult {
  externalId: string;
  name: string;
  setName: string | null;
  setExternalId: string | null;
  language: string;
  imageUrl: string | null;
  raw?: Record<string, unknown>;
}
