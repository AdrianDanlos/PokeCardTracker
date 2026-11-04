import { cacheRemoteImage, upsertCardFromSearch, upsertSetFromSearch } from "@/lib/adapters/cache";
import { getAdapter } from "@/lib/adapters";
import { createClient } from "@/lib/supabase/server";
import type { CardSourceId } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const source = body.source as CardSourceId;
  const externalId = body.externalId as string;
  const collectionId = body.collectionId as string;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adapter = getAdapter(source, body.language as string | undefined);
  const result = await adapter.getCard(externalId);
  if (!result) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const setId = await upsertSetFromSearch(
    supabase,
    source,
    result.setExternalId,
    result.setName,
    result.language,
  );
  const card = await upsertCardFromSearch(supabase, source, result, setId);
  await cacheRemoteImage(supabase, userData.user.id, card.id, result.imageUrl ?? "");

  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("collection_entries").upsert(
    {
      collection_id: collectionId,
      card_id: card.id,
      position: (maxPos?.position ?? -1) + 1,
    },
    { onConflict: "collection_id,card_id", ignoreDuplicates: true },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cardId: card.id });
}
