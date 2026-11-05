import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdapter } from "@/lib/adapters";
import { suggestTcgdexCards, suggestTcgdexSets } from "@/lib/adapters/tcgdex";
import { cacheRemoteImage, upsertCardFromSearch, upsertSetFromSearch } from "@/lib/adapters/cache";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CARD_LANGUAGE, type CardSourceId } from "@/lib/types";

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

export async function bulkAddCardsToCollection(params: {
  source: CardSourceId;
  externalIds: string[];
  collectionId: string;
  language?: string;
}) {
  for (const externalId of params.externalIds) {
    await addCardToCollection({
      source: params.source,
      externalId,
      collectionId: params.collectionId,
      language: params.language,
    });
  }
}

export async function importSetToCollection(
  params: {
    source: CardSourceId;
    setExternalId: string;
    collectionId: string;
    language?: string;
  },
  onProgress?: (done: number, total: number, phase: "import") => void,
) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const setExternalId = params.setExternalId.trim();
  if (!setExternalId) throw new Error("Enter a set ID or choose a set from suggestions.");

  const adapter = getAdapter(params.source, params.language);
  const imported = await adapter.importSet(setExternalId);
  if (imported.cards.length === 0) {
    throw new Error("This set has no cards to import (empty or unavailable in this language).");
  }

  let position = 0;
  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", params.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  position = (maxPos?.position ?? -1) + 1;

  const total = imported.cards.length;
  onProgress?.(0, total, "import");

  for (let i = 0; i < imported.cards.length; i++) {
    const externalId = imported.cards[i].externalId;
    const { cardId } = await syncCatalogCardFromApi(supabase, userData.user.id, {
      source: params.source,
      externalId,
      language: params.language,
    });
    const { error: entryErr } = await supabase.from("collection_entries").upsert(
      { collection_id: params.collectionId, card_id: cardId, position },
      { onConflict: "collection_id,card_id", ignoreDuplicates: true },
    );
    if (entryErr) throw new Error(entryErr.message);
    position += 1;
    onProgress?.(i + 1, total, "import");
  }
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
