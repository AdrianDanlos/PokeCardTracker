import { getAdapter } from "@/lib/adapters";
import { cacheRemoteImage, upsertCardFromSearch, upsertSetFromSearch } from "@/lib/adapters/cache";
import { createClient } from "@/lib/supabase/client";
import type { CardCategory, CardSourceId } from "@/lib/types";

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
    number: r.number,
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

  const adapter = getAdapter(params.source, params.language);
  const result = await adapter.getCard(params.externalId);
  if (!result) throw new Error("Card not found");

  const setId = await upsertSetFromSearch(
    supabase,
    params.source,
    result.setExternalId,
    result.setName,
    result.language,
  );
  const card = await upsertCardFromSearch(supabase, params.source, result, setId);
  if (result.imageUrl) {
    await cacheRemoteImage(supabase, userData.user.id, card.id as string, result.imageUrl);
  }

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
      card_id: card.id,
      position: (maxPos?.position ?? -1) + 1,
    },
    { onConflict: "collection_id,card_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  return card.id as string;
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

export async function importSetToCollection(params: {
  source: CardSourceId;
  setExternalId: string;
  collectionId: string;
  language?: string;
}) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const adapter = getAdapter(params.source, params.language);
  const imported = await adapter.importSet(params.setExternalId);
  const setId = await upsertSetFromSearch(
    supabase,
    params.source,
    imported.setExternalId,
    imported.setName,
    params.language ?? imported.cards[0]?.language ?? "en",
  );

  let position = 0;
  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", params.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  position = (maxPos?.position ?? -1) + 1;

  for (const result of imported.cards) {
    const card = await upsertCardFromSearch(supabase, params.source, result, setId);
    if (result.imageUrl) {
      await cacheRemoteImage(supabase, userData.user.id, card.id as string, result.imageUrl);
    }
    await supabase.from("collection_entries").upsert(
      { collection_id: params.collectionId, card_id: card.id, position },
      { onConflict: "collection_id,card_id", ignoreDuplicates: true },
    );
    position += 1;
  }
}

export async function createManualCard(params: {
  collectionId: string;
  name: string;
  number?: string;
  setName?: string;
  rarity?: string;
  language?: string;
  category?: CardCategory;
  edition?: string;
  variant?: string;
  imageFile?: File | null;
}) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  let setId: string | null = null;
  if (params.setName?.trim()) {
    setId = await upsertSetFromSearch(supabase, "manual", null, params.setName.trim(), params.language ?? "en");
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .insert({
      source_id: "manual",
      external_id: null,
      set_id: setId,
      number: params.number ?? null,
      name: params.name,
      rarity: params.rarity ?? null,
      language: params.language ?? "en",
      edition: params.edition ?? null,
      variant: params.variant ?? null,
      category: params.category ?? "custom",
      created_by: userData.user.id,
    })
    .select("*")
    .single();
  if (cardErr) throw new Error(cardErr.message);

  if (params.imageFile) {
    const ext = params.imageFile.name.split(".").pop() ?? "jpg";
    const path = `${userData.user.id}/manual/${card.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("card-images").upload(path, params.imageFile, {
      upsert: true,
    });
    if (!upErr) await supabase.from("cards").update({ image_path: path }).eq("id", card.id);
  }

  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", params.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("collection_entries").insert({
    collection_id: params.collectionId,
    card_id: card.id,
    position: (maxPos?.position ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
}
