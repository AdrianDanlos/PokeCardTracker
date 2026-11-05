import type { CardSearchResult } from "@/lib/types";
import type { CardSourceAdapter } from "./types";

const BASE = "https://api.pokemontcg.io/v2";

function mapCard(item: Record<string, unknown>): CardSearchResult[] {
  const set = item.set as Record<string, unknown> | undefined;
  const images = item.images as Record<string, string> | undefined;
  const base: CardSearchResult = {
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

  const results: CardSearchResult[] = [base];
  const subtypes = item.subtypes as string[] | undefined;
  if (subtypes?.includes("1st Edition")) {
    results.push({ ...base, externalId: `${base.externalId}::1st`, edition: "1st Edition" });
  }
  return results;
}

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`pokemontcg.io ${res.status}: ${path}`);
  return res.json() as Promise<{ data: Record<string, unknown>[] }>;
}

export function createPokemonTcgAdapter(): CardSourceAdapter {
  return {
    id: "pokemontcg",
    async searchCards(query, options) {
      const q = encodeURIComponent(query.trim());
      const pageSize = options?.pageSize ?? 20;
      const json = await fetchJson(`/cards?q=name:${q}*&pageSize=${pageSize}`);
      return json.data.flatMap(mapCard);
    },
    async getCard(externalId) {
      const baseId = externalId.split("::")[0];
      const res = await fetch(`${BASE}/cards/${encodeURIComponent(baseId)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: Record<string, unknown> };
      if (!json.data) return null;
      const mapped = mapCard(json.data);
      return mapped.find((c) => c.externalId === externalId) ?? mapped[0] ?? null;
    },
    async importSet(setExternalId) {
      const pageSize = 250;
      let page = 1;
      const cards: CardSearchResult[] = [];
      while (page <= 40) {
        const json = await fetchJson(
          `/cards?q=set.id:${encodeURIComponent(setExternalId)}&pageSize=${pageSize}&page=${page}`,
        );
        for (const row of json.data) cards.push(...mapCard(row));
        if (json.data.length < pageSize) break;
        page += 1;
      }
      return { setExternalId, setName: cards[0]?.setName ?? setExternalId, cards };
    },
  };
}

export const pokemonTcgAdapter = createPokemonTcgAdapter();
