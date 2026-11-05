import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdapter } from "@/lib/adapters";
import { suggestTcgdexCards, suggestTcgdexSets } from "@/lib/adapters/tcgdex";
import { cacheRemoteImage, upsertCardFromSearch, upsertSetFromSearch } from "@/lib/adapters/cache";
import {
  flattenJsonSetImport,
  normalizeCardName,
  type JsonSetImportGroup,
  type JsonSetImportRow,
} from "@/lib/json-set-import";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CARD_LANGUAGE, type CardSearchResult, type CardSourceId } from "@/lib/types";

const JSON_IMPORT_CATALOG_LANGUAGE = "en" as const;

type EnCatalogRef = {
  externalId: string;
  name: string;
  imageUrl: string | null;
};

export type JsonSetImportUnresolved = {
  name: string;
  set: string;
  reason: string;
};

export type JsonSetImportResult = {
  imported: number;
  unresolved: JsonSetImportUnresolved[];
};

/** Same catalog fetch + DB upsert + image cache path as single-card API add. */
async function syncCatalogCardFromApi(
  supabase: SupabaseClient,
  userId: string,
  params: { source: CardSourceId; externalId: string; language?: string },
) {
  const adapter = getAdapter(params.source, params.language);
  const result = await adapter.getCard(params.externalId);
  if (!result) throw new Error(`Card not found: ${params.externalId}`);

  const setId = await upsertSetFromSearch(
    supabase,
    params.source,
    result.setExternalId,
    result.setName,
    result.language,
  );
  const card = await upsertCardFromSearch(supabase, params.source, result, setId);
  let imagePath: string | null = null;
  if (result.imageUrl) {
    imagePath = await cacheRemoteImage(supabase, userId, card.id as string, result.imageUrl);
  }
  return { cardId: card.id as string, imagePath };
}

export async function suggestCatalogSets(params: { q: string; language?: string }) {
  return suggestTcgdexSets(params.language, params.q);
}

export async function suggestCatalogCards(params: { q: string; language?: string }) {
  return suggestTcgdexCards(params.language, params.q);
}

export async function searchCatalogCards(params: {
  q: string;
  source: CardSourceId;
  language?: string;
}) {
  const adapter = getAdapter(params.source, params.language);
  const results = await adapter.searchCards(params.q, { language: params.language });
  return results.map((r) => ({
    externalId: r.externalId,
    name: r.name,
    setName: r.setName,
    imageUrl: r.imageUrl,
  }));
}

export async function addCardToCollection(params: {
  source: CardSourceId;
  externalId: string;
  collectionId: string;
  language?: string;
}) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { cardId, imagePath } = await syncCatalogCardFromApi(
    supabase,
    userData.user.id,
    params,
  );

  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", params.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("collection_entries").upsert(
    {
      collection_id: params.collectionId,
      card_id: cardId,
      position: (maxPos?.position ?? -1) + 1,
    },
    { onConflict: "collection_id,card_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);

  const { data: entryRow, error: entryError } = await supabase
    .from("collection_entries")
    .select("id")
    .eq("collection_id", params.collectionId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (entryError) throw new Error(entryError.message);

  return {
    cardId,
    entryId: entryRow?.id as string | undefined,
    imagePath,
  };
}

function pickCatalogMatch(candidates: EnCatalogRef[], displayName: string): EnCatalogRef | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const exact = candidates.filter((c) => c.name.trim().toLowerCase() === displayName.trim().toLowerCase());
  if (exact.length === 1) return exact[0];
  return null;
}

function indexEnSetCards(cards: CardSearchResult[]): Map<string, EnCatalogRef[]> {
  const byNorm = new Map<string, EnCatalogRef[]>();
  for (const c of cards) {
    const ref: EnCatalogRef = {
      externalId: c.externalId,
      name: c.name,
      imageUrl: c.imageUrl,
    };
    const key = normalizeCardName(c.name);
    const list = byNorm.get(key) ?? [];
    list.push(ref);
    byNorm.set(key, list);
  }
  return byNorm;
}

async function loadEnSetCardIndex(
  enSetIds: string[],
  cache: Map<string, CardSearchResult[]>,
): Promise<Map<string, EnCatalogRef[]>> {
  const adapter = getAdapter("tcgdex", JSON_IMPORT_CATALOG_LANGUAGE);
  const merged: CardSearchResult[] = [];
  for (const setId of enSetIds) {
    const key = setId.toLowerCase();
    if (!cache.has(key)) {
      const imported = await adapter.importSet(setId);
      cache.set(key, imported.cards);
    }
    merged.push(...(cache.get(key) ?? []));
  }
  return indexEnSetCards(merged);
}

async function resolveEnCatalogRef(
  row: JsonSetImportRow,
  enSetIndex: Map<string, EnCatalogRef[]> | null,
): Promise<{ ref: EnCatalogRef | null; reason?: string }> {
  if (Object.prototype.hasOwnProperty.call(row, "id")) {
    if (row.id === null) return { ref: null };
    const adapter = getAdapter("tcgdex", JSON_IMPORT_CATALOG_LANGUAGE);
    const card = await adapter.getCard(row.id);
    if (!card) {
      return { ref: null, reason: `English card not found: ${row.id}` };
    }
    return {
      ref: { externalId: card.externalId, name: card.name, imageUrl: card.imageUrl },
    };
  }

  const norm = normalizeCardName(row.name);
  if (enSetIndex) {
    const candidates = enSetIndex.get(norm) ?? [];
    const picked = pickCatalogMatch(candidates, row.name);
    if (picked) return { ref: picked };
    if (candidates.length > 1) {
      return { ref: null, reason: "Multiple English cards match this name in enSets" };
    }
    return { ref: null, reason: "No matching card in enSets" };
  }

  const adapter = getAdapter("tcgdex", JSON_IMPORT_CATALOG_LANGUAGE);
  const results = await adapter.searchCards(row.name, {
    language: JSON_IMPORT_CATALOG_LANGUAGE,
    pageSize: 40,
  });
  const exact = results
    .filter((r) => normalizeCardName(r.name) === norm)
    .map((r) => ({ externalId: r.externalId, name: r.name, imageUrl: r.imageUrl }));
  const picked = pickCatalogMatch(exact, row.name);
  if (picked) return { ref: picked };
  if (exact.length > 1) {
    return { ref: null, reason: "Multiple English cards match this name" };
  }
  return { ref: null, reason: "No matching English card found" };
}

async function insertManualImportCard(
  supabase: SupabaseClient,
  userId: string,
  params: {
    collectionId: string;
    position: number;
    setLabel: string;
    name: string;
    enRef: EnCatalogRef | null;
    unresolvedReason?: string;
  },
): Promise<void> {
  const setId = await upsertSetFromSearch(
    supabase,
    "manual",
    null,
    params.setLabel,
    DEFAULT_CARD_LANGUAGE,
  );

  const attrs: Record<string, unknown> = {};
  if (params.enRef) attrs.en_external_id = params.enRef.externalId;
  if (params.unresolvedReason) attrs.en_resolve_error = params.unresolvedReason;

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .insert({
      source_id: "manual",
      external_id: null,
      set_id: setId,
      name: params.name,
      language: DEFAULT_CARD_LANGUAGE,
      image_url: params.enRef?.imageUrl ?? null,
      attrs,
      created_by: userId,
    })
    .select("id")
    .single();
  if (cardErr) throw new Error(cardErr.message);

  if (params.enRef?.imageUrl) {
    const imagePath = await cacheRemoteImage(
      supabase,
      userId,
      card.id as string,
      params.enRef.imageUrl,
    );
    if (imagePath) {
      await supabase.from("cards").update({ image_path: imagePath }).eq("id", card.id);
    }
  }

  const { error: entryErr } = await supabase.from("collection_entries").insert({
    collection_id: params.collectionId,
    card_id: card.id,
    position: params.position,
  });
  if (entryErr) throw new Error(entryErr.message);
}

export async function importJsonSetToCollection(
  groups: JsonSetImportGroup[],
  collectionId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<JsonSetImportResult> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const rows = flattenJsonSetImport(groups);
  if (rows.length === 0) throw new Error("No cards to import");

  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let position = (maxPos?.position ?? -1) + 1;

  const enSetCache = new Map<string, CardSearchResult[]>();
  const enSetIndexCache = new Map<string, Map<string, EnCatalogRef[]>>();
  const unresolved: JsonSetImportUnresolved[] = [];
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let enSetIndex: Map<string, EnCatalogRef[]> | null = null;
    if (row.enSets.length > 0) {
      const cacheKey = row.enSets.map((s) => s.toLowerCase()).join("\0");
      if (!enSetIndexCache.has(cacheKey)) {
        enSetIndexCache.set(cacheKey, await loadEnSetCardIndex(row.enSets, enSetCache));
      }
      enSetIndex = enSetIndexCache.get(cacheKey) ?? null;
    }

    const { ref, reason } = await resolveEnCatalogRef(row, enSetIndex);
    const skipImageByChoice =
      Object.prototype.hasOwnProperty.call(row, "id") && row.id === null;
    if (!ref && reason && !skipImageByChoice) {
      unresolved.push({ name: row.name, set: row.setLabel, reason });
    }

    await insertManualImportCard(supabase, userData.user.id, {
      collectionId,
      position,
      setLabel: row.setLabel,
      name: row.name,
      enRef: ref,
      unresolvedReason: ref ? undefined : reason,
    });
    position += 1;
    onProgress?.(i + 1, total);
  }

  return { imported: total, unresolved };
}

export async function createManualCard(
  params: {
    collectionId: string;
    name: string;
    setName: string;
    language?: string;
    imageFile?: File | null;
  },
  onProgress?: (message: string) => void,
) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  onProgress?.("Creating card…");
  const setId = await upsertSetFromSearch(
    supabase,
    "manual",
    null,
    params.setName.trim(),
    params.language ?? DEFAULT_CARD_LANGUAGE,
  );

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .insert({
      source_id: "manual",
      external_id: null,
      set_id: setId,
      name: params.name,
      language: params.language ?? DEFAULT_CARD_LANGUAGE,
      created_by: userData.user.id,
    })
    .select("*")
    .single();
  if (cardErr) throw new Error(cardErr.message);

  if (params.imageFile) {
    onProgress?.("Uploading photo…");
    const ext = params.imageFile.name.split(".").pop() ?? "jpg";
    const path = `${userData.user.id}/manual/${card.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("card-images").upload(path, params.imageFile, {
      upsert: true,
    });
    if (!upErr) await supabase.from("cards").update({ image_path: path }).eq("id", card.id);
  }

  onProgress?.("Adding to collection…");
  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", params.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: entry, error: entryErr } = await supabase
    .from("collection_entries")
    .insert({
      collection_id: params.collectionId,
      card_id: card.id,
      position: (maxPos?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (entryErr) throw new Error(entryErr.message);
  return entry.id as string;
}
