import type { CardSourceAdapter, ImportSetResult } from "./types";
import type { CardSearchResult } from "@/lib/types";

function langPath(language = "en") {
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

export function createTcgdexAdapter(defaultLanguage = "en"): CardSourceAdapter {
  return {
    id: "tcgdex",
    async searchCards(query, options) {
      const lang = langPath(options?.language ?? defaultLanguage);
      const cards = (await fetchTcgdex(`/${lang}/cards`)) as Record<string, unknown>[];
      const q = query.trim().toLowerCase();
      return cards
        .filter((c) => String(c.name).toLowerCase().includes(q))
        .slice(0, options?.pageSize ?? 30)
        .map((c) => mapCard(c, lang));
    },
    async getCard(externalId) {
      const lang = langPath(defaultLanguage);
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
      const lang = langPath(defaultLanguage);
      const set = (await fetchTcgdex(
        `/${lang}/sets/${encodeURIComponent(setExternalId)}`,
      )) as Record<string, unknown>;
      const cardIds = (set.cards as { id: string }[] | undefined) ?? [];
      const cards: CardSearchResult[] = [];
      for (const ref of cardIds.slice(0, 250)) {
        const card = await this.getCard(ref.id);
        if (card) cards.push(card);
      }
      return {
        setExternalId,
        setName: String(set.name ?? setExternalId),
        cards,
      } satisfies ImportSetResult;
    },
  };
}

export const tcgdexAdapter = createTcgdexAdapter();
