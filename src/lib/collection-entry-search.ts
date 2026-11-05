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

export const COLLECTION_SET_FILTER_NONE = "__none__";

/** Collapse whitespace for set filter grouping (same label → one filter option). */
export function normalizeCollectionSetFilterName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function collectionEntrySetFilterKey(
  entry: CollectionEntryWithCard,
): string {
  const name = entry.card.set?.name?.trim();
  if (name) return `name:${normalizeCollectionSetFilterName(name)}`;
  return COLLECTION_SET_FILTER_NONE;
}

export function collectionEntrySetFilterLabel(
  entry: CollectionEntryWithCard,
): string {
  const name = entry.card.set?.name?.trim();
  if (name) return name;
  return "No set";
}

export type CollectionSetFilterOption = { key: string; label: string };

export function listCollectionSetFilterOptions(
  entries: CollectionEntryWithCard[],
): CollectionSetFilterOption[] {
  const byKey = new Map<string, string>();
  for (const entry of entries) {
    const key = collectionEntrySetFilterKey(entry);
    if (!byKey.has(key)) {
      byKey.set(key, collectionEntrySetFilterLabel(entry));
    }
  }
  const noneKey = COLLECTION_SET_FILTER_NONE;
  const withSet = [...byKey.entries()]
    .filter(([key]) => key !== noneKey)
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  if (byKey.has(noneKey)) {
    withSet.push({ key: noneKey, label: byKey.get(noneKey)! });
  }
  return withSet;
}

/** Unique set display names already used in a collection (sorted for pickers). */
export function listCollectionSetNamesFromEntries(
  entries: CollectionEntryWithCard[],
): string[] {
  return listCollectionSetFilterOptions(entries)
    .filter((o) => o.key !== COLLECTION_SET_FILTER_NONE)
    .map((o) => o.label);
}
