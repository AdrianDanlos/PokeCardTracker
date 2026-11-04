import { cacheRemoteImage, upsertCardFromSearch, upsertSetFromSearch } from "@/lib/adapters/cache";
import { getAdapter } from "@/lib/adapters";
import { createClient } from "@/lib/supabase/server";
import type { CardSourceId } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const source = body.source as CardSourceId;
  const setExternalId = body.setExternalId as string;
  const collectionId = body.collectionId as string;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adapter = getAdapter(source);
  const imported = await adapter.importSet(setExternalId);
  const setId = await upsertSetFromSearch(
    supabase,
    source,
    imported.setExternalId,
    imported.setName,
    imported.cards[0]?.language ?? "en",
  );

  let position = 0;
  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  position = (maxPos?.position ?? -1) + 1;

  let added = 0;
  for (const result of imported.cards) {
    const card = await upsertCardFromSearch(supabase, source, result, setId);
    if (result.imageUrl) {
      await cacheRemoteImage(supabase, userData.user.id, card.id, result.imageUrl);
    }
    const { error } = await supabase.from("collection_entries").upsert(
      {
        collection_id: collectionId,
        card_id: card.id,
        position: position++,
      },
      { onConflict: "collection_id,card_id", ignoreDuplicates: true },
    );
    if (!error) added++;
  }

  return NextResponse.json({ added, setName: imported.setName });
}
