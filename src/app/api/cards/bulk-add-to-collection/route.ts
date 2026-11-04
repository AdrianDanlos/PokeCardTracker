import { cacheRemoteImage, upsertCardFromSearch, upsertSetFromSearch } from "@/lib/adapters/cache";
import { getAdapter } from "@/lib/adapters";
import { createClient } from "@/lib/supabase/server";
import type { CardSourceId } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    source?: CardSourceId;
    externalIds?: string[];
    collectionId?: string;
    language?: string;
  };
  const source = body.source ?? "pokemontcg";
  const externalIds = body.externalIds ?? [];
  const collectionId = body.collectionId ?? "";
  if (!collectionId || externalIds.length === 0) {
    return NextResponse.json({ error: "collectionId and externalIds required" }, { status: 400 });
  }

  const adapter = getAdapter(source, body.language);
  let added = 0;
  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let position = (maxPos?.position ?? -1) + 1;

  for (const externalId of externalIds) {
    const result = await adapter.getCard(externalId);
    if (!result) continue;
    const setId = await upsertSetFromSearch(
      supabase,
      source,
      result.setExternalId,
      result.setName,
      result.language,
    );
    const card = await upsertCardFromSearch(supabase, source, result, setId);
    await cacheRemoteImage(supabase, userData.user.id, card.id, result.imageUrl ?? "");
    const { error } = await supabase.from("collection_entries").upsert(
      {
        collection_id: collectionId,
        card_id: card.id,
        position: position++,
      },
      { onConflict: "collection_id,card_id", ignoreDuplicates: false },
    );
    if (!error) added++;
  }

  return NextResponse.json({ added });
}
