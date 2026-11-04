import type { CardSourceAdapter, ImportSetResult } from "./types";
import type { CardSearchResult } from "@/lib/types";

const BASE = "https://api.pokemontcg.io/v2";

function mapCard(item: Record<string, unknown>): CardSearchResult {
  const set = item.set as Record<string, unknown> | undefined;
  const images = item.images as Record<string, string> | undefined;
  return {
    externalId: String(item.id),
    name: String(item.name),
    number: item.number != null ? String(item.number) : null,
    setName: set?.name != null ? String(set.name) : null,
    setExternalId: set?.id != null ? String(set.id) : null,
    rarity: item.rarity != null ? String(item.rarity) : null,
    language: "en",
    imageUrl: images?.large ?? images?.small ?? null,
    category: "official",
    edition: null,
    variant: null,
    raw: item,
  };
}

async function fetchJson(path: string, apiKey?: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;
  const res = await fetch(`${BASE}${path}`, { headers, next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`pokemontcg.io ${res.status}: ${path}`);
  }
  return res.json() as Promise<{ data: Record<string, unknown>[] }>;
}

export function createPokemonTcgAdapter(apiKey?: string): CardSourceAdapter {
  return {
    id: "pokemontcg",
    async searchCards(query, options) {
      const q = encodeURIComponent(query.trim());
      const pageSize = options?.pageSize ?? 20;
      const json = await fetchJson(
        `/cards?q=name:${q}*&pageSize=${pageSize}`,
        apiKey ?? process.env.POKEMONTCG_API_KEY,
      );
      return json.data.map(mapCard);
    },
    async getCard(externalId) {
      const headers: Record<string, string> = { Accept: "application/json" };
      const key = apiKey ?? process.env.POKEMONTCG_API_KEY;
      if (key) headers["X-Api-Key"] = key;
      const res = await fetch(`${BASE}/cards/${encodeURIComponent(externalId)}`, {
        headers,
        next: { revalidate: 3600 },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: Record<string, unknown> };
      return json.data ? mapCard(json.data) : null;
    },
    async importSet(setExternalId) {
      const json = await fetchJson(
        `/cards?q=set.id:${encodeURIComponent(setExternalId)}&pageSize=250`,
        apiKey ?? process.env.POKEMONTCG_API_KEY,
      );
      const cards = json.data.map(mapCard);
      const setName = cards[0]?.setName ?? setExternalId;
      return { setExternalId, setName, cards } satisfies ImportSetResult;
    },
  };
}

export const pokemonTcgAdapter = createPokemonTcgAdapter();
