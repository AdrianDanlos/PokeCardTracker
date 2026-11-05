import { upsertSetFromSearch } from "@/lib/adapters/cache";
import { createClient } from "@/lib/supabase/client";

export type TcgplayerSetCard = {
  productId: string;
  name: string;
  imageUrl: string;
};

export type TcgplayerSetPayload = {
  setName: string;
  slug: string;
  cards: TcgplayerSetCard[];
};

function externalId(productId: string) {
  return `tcgplayer-${productId}`;
}

async function fetchTcgplayerSet(setName: string): Promise<TcgplayerSetPayload> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("tcgos-set", {
    body: { setName },
  });
  const payload = data as (TcgplayerSetPayload & { error?: string }) | null;
  if (payload?.error) throw new Error(payload.error);
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) throw new Error(body.error);
      } catch (e) {
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw new Error(error.message);
  }
  if (!payload?.cards?.length) throw new Error("No cards returned for this set");
  return payload;
}

/** Fetch a Japanese set from The TCG OS and add its cards to a collection. */
export async function importTcgplayerSet(collectionId: string, setName: string) {
  const payload = await fetchTcgplayerSet(setName);
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const setId = await upsertSetFromSearch(
    supabase,
    "manual",
    payload.slug,
    payload.setName,
    "jp",
  );

  const { error: cardErr } = await supabase.from("cards").upsert(
    payload.cards.map((card) => ({
      source_id: "manual",
      external_id: externalId(card.productId),
      set_id: setId,
      name: card.name,
      language: "jp",
      image_url: card.imageUrl,
      created_by: userData.user.id,
    })),
    { onConflict: "source_id,external_id" },
  );
  if (cardErr) throw new Error(cardErr.message);

  const externalIds = payload.cards.map((card) => externalId(card.productId));
  const { data: cards, error: readErr } = await supabase
    .from("cards")
    .select("id, external_id")
    .eq("source_id", "manual")
    .in("external_id", externalIds);
  if (readErr) throw new Error(readErr.message);

  const idByExternal = new Map(
    (cards ?? []).map((card) => [card.external_id as string, card.id as string]),
  );
  const orderedIds = payload.cards
    .map((card) => idByExternal.get(externalId(card.productId)))
    .filter((id): id is string => Boolean(id));
  if (orderedIds.length !== payload.cards.length) {
    throw new Error("Could not save every card from this set");
  }

  const { data: existing, error: existingErr } = await supabase
    .from("collection_entries")
    .select("card_id")
    .eq("collection_id", collectionId)
    .in("card_id", orderedIds);
  if (existingErr) throw new Error(existingErr.message);

  const already = new Set((existing ?? []).map((row) => row.card_id as string));
  const missing = orderedIds.filter((id) => !already.has(id));

  if (missing.length > 0) {
    const { data: maxPos, error: posErr } = await supabase
      .from("collection_entries")
      .select("position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (posErr) throw new Error(posErr.message);

    let position = (maxPos?.position ?? -1) + 1;
    const { error: entryErr } = await supabase.from("collection_entries").insert(
      missing.map((cardId) => ({
        collection_id: collectionId,
        card_id: cardId,
        position: position++,
      })),
    );
    if (entryErr) throw new Error(entryErr.message);
  }

  return {
    added: missing.length,
    setName: payload.setName,
    total: payload.cards.length,
  };
}
