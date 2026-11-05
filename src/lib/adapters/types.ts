import type { CardSearchResult, CardSourceId } from "@/lib/types";

export interface ImportSetResult {
  setExternalId: string;
  setName: string;
  cards: CardSearchResult[];
}

export interface CardSourceAdapter {
  id: CardSourceId;
  searchCards(query: string, options?: { language?: string; pageSize?: number }): Promise<CardSearchResult[]>;
  getCard(externalId: string): Promise<CardSearchResult | null>;
  importSet(setExternalId: string): Promise<ImportSetResult>;
}
