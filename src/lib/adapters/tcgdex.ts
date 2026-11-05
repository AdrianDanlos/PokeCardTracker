import type { CardSearchResult } from "@/lib/types";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/types";
import type { CardSourceAdapter, ImportSetResult } from "./types";

/** TCGdex API locale segments use `ja`, not `jp`. */
function tcgdxApiLang(language?: string): "ja" | "en" {
  return language === "en" ? "en" : "ja";
}

function appLanguage(language?: string): string {
  return language === "en" ? "en" : DEFAULT_CARD_LANGUAGE;
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
    setName: null,
    setExternalId: null,
    language,
    imageUrl: tcgdxImageUrl(image),
    raw: item,
  };
}

function mapCard(item: Record<string, unknown>, language: string): CardSearchResult {
  const set = item.set as Record<string, unknown> | undefined;
  const image = item.image as string | undefined;
  return {
    externalId: String(item.id ?? item.localId),
    name: String(item.name),
    setName: set?.name != null ? String(set.name) : null,
    setExternalId: set?.id != null ? String(set.id) : null,
    language,
    imageUrl: tcgdxImageUrl(image),
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

export function createTcgdexAdapter(defaultLanguage = DEFAULT_CARD_LANGUAGE): CardSourceAdapter {
  const defaultApiLang = tcgdxApiLang(defaultLanguage);
  const defaultAppLang = appLanguage(defaultLanguage);

  return {
    id: "tcgdex",
    async searchCards(query, options) {
      const requested = options?.language ?? defaultLanguage;
      const apiLang = tcgdxApiLang(requested);
      const storedLang = appLanguage(requested);
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const limit = options?.pageSize ?? 30;
      const results: CardSearchResult[] = [];
      const pageSize = 100;
      let page = 1;

      while (results.length < limit && page <= 25) {
        const cards = (await fetchTcgdex(
          `/${apiLang}/cards?pagination:page=${page}&pagination:itemsPerPage=${pageSize}`,
        )) as Record<string, unknown>[];
        if (!Array.isArray(cards) || cards.length === 0) break;

        for (const c of cards) {
          const name = String(c.name ?? "").toLowerCase();
          const id = String(c.id ?? "").toLowerCase();
          if (name.includes(q) || id.includes(q)) {
            results.push(mapBrief(c, storedLang));
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
          `/${defaultApiLang}/cards/${encodeURIComponent(externalId)}`,
        )) as Record<string, unknown>;
        return mapCard(card, defaultAppLang);
      } catch {
        return null;
      }
    },
    async importSet(setExternalId) {
      let set: Record<string, unknown>;
      try {
        set = (await fetchTcgdex(
          `/${defaultApiLang}/sets/${encodeURIComponent(setExternalId)}`,
        )) as Record<string, unknown>;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("404")) {
          throw new Error(
            defaultApiLang === "ja"
              ? `Set “${setExternalId}” is not in the Japanese TCGdex catalog. Switch TCGdex language to English (en), or pick a set from the suggestions list.`
              : `Set “${setExternalId}” was not found. Check the set ID (e.g. gym2) or pick from suggestions.`,
          );
        }
        throw e;
      }
      const setName = String(set.name ?? setExternalId);
      const cardRefs =
        (set.cards as { id: string; name?: string; image?: string; localId?: string }[] | undefined) ??
        [];
      const cards: CardSearchResult[] = cardRefs.slice(0, 500).map((ref) => {
        const image = ref.image as string | undefined;
        return {
          externalId: String(ref.id),
          name: String(ref.name ?? ref.id),
          setName,
          setExternalId,
          language: defaultAppLang,
          imageUrl: tcgdxImageUrl(image),
          raw: ref,
        };
      });
      return {
        setExternalId,
        setName,
        cards,
      } satisfies ImportSetResult;
    },
  };
}

export const tcgdexAdapter = createTcgdexAdapter(DEFAULT_CARD_LANGUAGE);

const setsListCache = new Map<string, { id: string; name: string }[]>();

export async function suggestTcgdexSets(
  language: string | undefined,
  query: string,
  limit = 10,
): Promise<{ id: string; name: string }[]> {
  const apiLang = tcgdxApiLang(language);
  let list = setsListCache.get(apiLang);
  if (!list) {
    const raw = (await fetchTcgdex(`/${apiLang}/sets`)) as { id: string; name: string }[];
    list = raw.map((s) => ({ id: String(s.id), name: String(s.name) }));
    setsListCache.set(apiLang, list);
  }
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return list
    .filter((s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, limit);
}

export async function suggestTcgdexCards(
  language: string | undefined,
  query: string,
  limit = 10,
): Promise<{ externalId: string; name: string }[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const apiLang = tcgdxApiLang(language);
  const pageSize = Math.min(limit * 3, 30);
  const cards = (await fetchTcgdex(
    `/${apiLang}/cards?name=${encodeURIComponent(q)}&pagination:page=1&pagination:itemsPerPage=${pageSize}`,
  )) as Record<string, unknown>[];
  if (!Array.isArray(cards)) return [];

  const seen = new Set<string>();
  const out: { externalId: string; name: string }[] = [];
  for (const c of cards) {
    const externalId = String(c.id ?? c.localId);
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    out.push({ externalId, name: String(c.name ?? "") });
    if (out.length >= limit) break;
  }
  return out;
}
