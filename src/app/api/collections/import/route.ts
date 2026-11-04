import { parseCollectionCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const collectionId = String(form.get("collectionId") ?? "");
  const file = form.get("file");
  if (!collectionId || !(file instanceof File)) {
    return NextResponse.json({ error: "collectionId and file required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCollectionCsv(text);
  let added = 0;
  let position = 0;
  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  position = (maxPos?.position ?? -1) + 1;

  for (const row of rows) {
    let cardId = row.card_id;
    if (!cardId && row.name) {
      const { data: found } = await supabase
        .from("cards")
        .select("id")
        .ilike("name", row.name)
        .limit(1)
        .maybeSingle();
      cardId = found?.id;
    }
    if (!cardId) continue;
    const { error } = await supabase.from("collection_entries").upsert(
      {
        collection_id: collectionId,
        card_id: cardId,
        position: row.position ?? position++,
      },
      { onConflict: "collection_id,card_id", ignoreDuplicates: true },
    );
    if (!error) added++;
  }

  return NextResponse.json({ added });
}
