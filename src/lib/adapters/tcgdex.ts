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
  let base = image.startsWith("http") ? image.replace(/\/$/, "") : `https://assets.tcgdex.net/${image}`;
  if (base.endsWith("/high.webp") || base.endsWith("/low.webp")) {
    return base;
  }
  return `${base}/${quality}.webp`;
}

/** Base TCGdex asset URL suitable for fetch + storage (no /high.webp suffix). */
export function tcgdxImageBaseUrl(imageUrl: string): string {
  return imageUrl.replace(/\/(high|low)\.webp$/i, "").replace(/\/$/, "");
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

function tokenizeSearchQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** TCGdex card ids are usually `{setId}-{localId}` e.g. dp3-2. */
function inferSetIdFromCardId(cardId: string): string | null {
  const id = cardId.trim();
  const dash = id.lastIndexOf("-");
  if (dash <= 0) return null;
  const suffix = id.slice(dash + 1);
  if (!/^\d+$/.test(suffix)) return null;
  return id.slice(0, dash);
}

function isIdLikeToken(token: string): boolean {
  return /^[a-z0-9]+-\d+$/i.test(token);
}

function pickNameTokenForApi(tokens: string[]): string {
  const nonId = tokens.filter((t) => !isIdLikeToken(t));
  if (nonId.length === 0) return tokens[0];
  return nonId.reduce((a, b) => (a.length >= b.length ? a : b));
}

function buildCardSearchHaystack(
  c: Record<string, unknown>,
  setNameById?: Map<string, string>,
): string {
  const id = String(c.id ?? "").toLowerCase();
  const localId = String(c.localId ?? "").toLowerCase();
  const name = String(c.name ?? "").toLowerCase();
  const parts = [name, id, localId];
  const setId = inferSetIdFromCardId(String(c.id ?? ""));
  if (setId) {
    parts.push(setId.toLowerCase());
    const setName = setNameById?.get(setId.toLowerCase());
    if (setName) parts.push(setName.toLowerCase());
  }
  return parts.join(" ");
}

function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  return tokens.every((t) => haystack.includes(t));
}

async function getSetNameByIdMap(apiLang: "ja" | "en"): Promise<Map<string, string>> {
  let list = setsListCache.get(apiLang);
  if (!list) {
    const raw = (await fetchTcgdex(`/${apiLang}/sets`)) as { id: string; name: string }[];
    list = raw.map((s) => ({ id: String(s.id), name: String(s.name) }));
    setsListCache.set(apiLang, list);
  }
  return new Map(list.map((s) => [s.id.toLowerCase(), s.name]));
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
      const tokens = tokenizeSearchQuery(query);
      if (tokens.length === 0) return [];

      const limit = options?.pageSize ?? 30;
      const results: CardSearchResult[] = [];
      const seen = new Set<string>();
      const setNameById = await getSetNameByIdMap(apiLang);

      function pushIfMatch(c: Record<string, unknown>) {
        const externalId = String(c.id ?? c.localId);
        if (seen.has(externalId)) return;
        const hay = buildCardSearchHaystack(c, setNameById);
        if (!matchesAllTokens(hay, tokens)) return;
        seen.add(externalId);
        const row = mapBrief(c, storedLang);
        const setId = inferSetIdFromCardId(externalId);
        if (setId) row.setName = setNameById.get(setId.toLowerCase()) ?? null;
        results.push(row);
      }

      if (tokens.length === 1 && isIdLikeToken(tokens[0])) {
        try {
          const card = (await fetchTcgdex(
            `/${apiLang}/cards/${encodeURIComponent(tokens[0])}`,
          )) as Record<string, unknown>;
          pushIfMatch(card);
          if (results.length >= limit) return results;
        } catch {
          /* fall through to name / pagination search */
        }
      }

      const nameToken = pickNameTokenForApi(tokens);
      if (nameToken && !isIdLikeToken(nameToken)) {
        const apiPageSize = Math.min(Math.max(limit * 4, 40), 100);
        const cards = (await fetchTcgdex(
          `/${apiLang}/cards?name=${encodeURIComponent(nameToken)}&pagination:page=1&pagination:itemsPerPage=${apiPageSize}`,
        )) as Record<string, unknown>[];
        if (Array.isArray(cards)) {
          for (const c of cards) {
            pushIfMatch(c);
            if (results.length >= limit) return results;
          }
        }
      }

      const pageSize = 100;
      let page = 1;
      while (results.length < limit && page <= 25) {
        const cards = (await fetchTcgdex(
          `/${apiLang}/cards?pagination:page=${page}&pagination:itemsPerPage=${pageSize}`,
        )) as Record<string, unknown>[];
        if (!Array.isArray(cards) || cards.length === 0) break;

        for (const c of cards) {
          pushIfMatch(c);
          if (results.length >= limit) break;
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
): Promise<{ externalId: string; name: string; setName: string | null; imageUrl: string | null }[]> {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.join("").length < 2) return [];
  const apiLang = tcgdxApiLang(language);
  const setNameById = await getSetNameByIdMap(apiLang);

  const seen = new Set<string>();
  const out: { externalId: string; name: string; setName: string | null; imageUrl: string | null }[] =
    [];

  function pushIfMatch(c: Record<string, unknown>) {
    const externalId = String(c.id ?? c.localId);
    if (seen.has(externalId)) return;
    const hay = buildCardSearchHaystack(c, setNameById);
    if (!matchesAllTokens(hay, tokens)) return;
    seen.add(externalId);
    const setId = inferSetIdFromCardId(externalId);
    const image = c.image as string | undefined;
    out.push({
      externalId,
      name: String(c.name ?? ""),
      setName: setId ? (setNameById.get(setId.toLowerCase()) ?? null) : null,
      imageUrl: tcgdxImageUrl(image),
    });
  }

  if (tokens.length === 1 && isIdLikeToken(tokens[0])) {
    try {
      const card = (await fetchTcgdex(
        `/${apiLang}/cards/${encodeURIComponent(tokens[0])}`,
      )) as Record<string, unknown>;
      pushIfMatch(card);
      return out.slice(0, limit);
    } catch {
      return [];
    }
  }

  const nameToken = pickNameTokenForApi(tokens);
  const pageSize = Math.min(Math.max(limit * 5, 30), 100);
  const cards = (await fetchTcgdex(
    `/${apiLang}/cards?name=${encodeURIComponent(nameToken)}&pagination:page=1&pagination:itemsPerPage=${pageSize}`,
  )) as Record<string, unknown>[];
  if (Array.isArray(cards)) {
    for (const c of cards) {
      pushIfMatch(c);
      if (out.length >= limit) break;
    }
  }

  if (out.length === 0) {
    const idToken = tokens.find(isIdLikeToken);
    if (idToken) {
      try {
        const card = (await fetchTcgdex(
          `/${apiLang}/cards/${encodeURIComponent(idToken)}`,
        )) as Record<string, unknown>;
        pushIfMatch(card);
      } catch {
        /* no match */
      }
    }
  }

  return out.slice(0, limit);
}
