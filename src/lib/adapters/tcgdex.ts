import type { CardSearchResult } from "@/lib/types";
import type { CardSourceAdapter, ImportSetResult } from "./types";

function langPath(language = "ja") {
  return language === "ja" ? "ja" : "en";
}

/** TCGdex image bases: https://tcgdex.dev — append quality suffix. */
export function tcgdxImageUrl(image: string | null | undefined, quality: "high" | "low" = "high") {
  if (!image) return null;
  const base = image.startsWith("http") ? image.replace(/\/$/, "") : `https://assets.tcgdex.net/${image}`;
  return `${base}/${quality}.webp`;
}

function mapBrief(item: Record<string, unknown>, language: string): CardSearchResult {
  const image = item.image as string | undefined;
  return {
    externalId: String(item.id ?? item.localId),
    name: String(item.name),
    number: item.localId != null ? String(item.localId) : null,
    setName: null,
    setExternalId: null,
    rarity: item.rarity != null ? String(item.rarity) : null,
    language,
    imageUrl: tcgdxImageUrl(image),
    category: "official",
    edition: null,
    variant: null,
    raw: item,
  };
}

function mapCard(item: Record<string, unknown>, language: string): CardSearchResult {
  const set = item.set as Record<string, unknown> | undefined;
  const image = item.image as string | undefined;
  return {
    externalId: String(item.id ?? item.localId),
    name: String(item.name),
    number: item.localId != null ? String(item.localId) : null,
    setName: set?.name != null ? String(set.name) : null,
    setExternalId: set?.id != null ? String(set.id) : null,
    rarity: item.rarity != null ? String(item.rarity) : null,
    language,
    imageUrl: tcgdxImageUrl(image),
    category: "official",
    edition: null,
    variant: null,
    raw: item,
  };
}

async function fetchTcgdex(path: string) {
  const res = await fetch(`https://api.tcgdex.net/v2${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TCGdex ${res.status}: ${path}`);
  return res.json();
}

export function createTcgdexAdapter(defaultLanguage = "ja"): CardSourceAdapter {
  const lang = langPath(defaultLanguage);

  return {
    id: "tcgdex",
    async searchCards(query, options) {
      const language = langPath(options?.language ?? defaultLanguage);
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const limit = options?.pageSize ?? 30;
      const results: CardSearchResult[] = [];
      const pageSize = 100;
      let page = 1;

      while (results.length < limit && page <= 25) {
        const cards = (await fetchTcgdex(
          `/${language}/cards?pagination:page=${page}&pagination:itemsPerPage=${pageSize}`,
        )) as Record<string, unknown>[];
        if (!Array.isArray(cards) || cards.length === 0) break;

        for (const c of cards) {
          const name = String(c.name ?? "").toLowerCase();
          const id = String(c.id ?? "").toLowerCase();
          if (name.includes(q) || id.includes(q)) {
            results.push(mapBrief(c, language));
            if (results.length >= limit) break;
          }
        }
        if (cards.length < pageSize) break;
        page += 1;
      }

      return results;
    },
    async getCard(externalId) {
      try {
        const card = (await fetchTcgdex(
          `/${lang}/cards/${encodeURIComponent(externalId)}`,
        )) as Record<string, unknown>;
        return mapCard(card, lang);
      } catch {
        return null;
      }
    },
    async importSet(setExternalId) {
      const set = (await fetchTcgdex(
        `/${lang}/sets/${encodeURIComponent(setExternalId)}`,
      )) as Record<string, unknown>;
      const cardRefs = (set.cards as { id: string }[] | undefined) ?? [];
      const cards: CardSearchResult[] = [];
      for (const ref of cardRefs.slice(0, 500)) {
        try {
          const card = (await fetchTcgdex(
            `/${lang}/cards/${encodeURIComponent(ref.id)}`,
          )) as Record<string, unknown>;
          cards.push(mapCard(card, lang));
        } catch {
          /* skip */
        }
      }
      return {
        setExternalId,
        setName: String(set.name ?? setExternalId),
        cards,
      } satisfies ImportSetResult;
    },
  };
}

export const tcgdexAdapter = createTcgdexAdapter("ja");
