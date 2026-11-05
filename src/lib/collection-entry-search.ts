import type { CollectionEntryWithCard } from "@/lib/types";

export function tokenizeCollectionSearch(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function collectionEntrySearchHaystack(entry: CollectionEntryWithCard): string {
  const parts = [entry.card.name];
  const setName = entry.card.set?.name?.trim();
  if (setName) parts.push(setName);
  const externalId = entry.card.external_id?.trim();
  if (externalId) parts.push(externalId);
  return parts.join(" ").toLowerCase();
}

export function matchesCollectionEntrySearch(
  entry: CollectionEntryWithCard,
  query: string,
): boolean {
  const tokens = tokenizeCollectionSearch(query);
  if (tokens.length === 0) return true;
  const hay = collectionEntrySearchHaystack(entry);
  return tokens.every((t) => hay.includes(t));
}
