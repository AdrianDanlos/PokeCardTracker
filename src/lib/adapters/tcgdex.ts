import type { CardSourceAdapter, ImportSetResult } from "./types";
import type { CardSearchResult } from "@/lib/types";

function langPath(language = "ja") {
  return language === "ja" ? "ja" : "en";
}

function mapCard(item: Record<string, unknown>, language: string): CardSearchResult {
  const image = item.image as string | undefined;
  const set = item.set as Record<string, unknown> | undefined;
  return {
    externalId: String(item.id ?? item.localId),
    name: String(item.name),
    number: item.localId != null ? String(item.localId) : null,
    setName: set?.name != null ? String(set.name) : null,
    setExternalId: set?.id != null ? String(set.id) : null,
    rarity: item.rarity != null ? String(item.rarity) : null,
    language,
    imageUrl: image ? `${image}/high.webp` : null,
    category: "official",
    edition: null,
    variant: null,
    raw: item,
  };
}

async function fetchTcgdex(path: string) {
  const res = await fetch(`https://api.tcgdex.net/v2${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
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
      const cards = (await fetchTcgdex(`/${language}/cards`)) as Record<string, unknown>[];
      return cards
        .filter((c) => String(c.name).toLowerCase().includes(q))
        .slice(0, options?.pageSize ?? 30)
        .map((c) => mapCard(c, language));
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
      const cardIds = (set.cards as { id: string }[] | undefined) ?? [];
      const cards: CardSearchResult[] = [];
      for (const ref of cardIds.slice(0, 500)) {
        try {
          const card = (await fetchTcgdex(
            `/${lang}/cards/${encodeURIComponent(ref.id)}`,
          )) as Record<string, unknown>;
          cards.push(mapCard(card, lang));
        } catch {
          /* skip missing */
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
