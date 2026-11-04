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
  const name = String(form.get("name") ?? "").trim();
  if (!name || !collectionId) {
    return NextResponse.json({ error: "Name and collection required" }, { status: 400 });
  }

  const setName = String(form.get("setName") ?? "").trim();
  let setId: string | null = null;
  if (setName) {
    const { data: setRow } = await supabase
      .from("sets")
      .upsert(
        {
          source_id: "manual",
          external_id: setName.toLowerCase().replace(/\s+/g, "-"),
          name: setName,
          language: String(form.get("language") ?? "en"),
        },
        { onConflict: "source_id,external_id" },
      )
      .select("id")
      .single();
    setId = setRow?.id ?? null;
  }

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .insert({
      source_id: "manual",
      external_id: null,
      set_id: setId,
      number: String(form.get("number") ?? "") || null,
      name,
      rarity: String(form.get("rarity") ?? "") || null,
      language: String(form.get("language") ?? "en"),
      edition: String(form.get("edition") ?? "").trim() || null,
      variant: String(form.get("variant") ?? "").trim() || null,
      category: (String(form.get("category") ?? "custom") || "custom") as
        | "official"
        | "promo"
        | "variant"
        | "misprint"
        | "custom",
      created_by: userData.user.id,
    })
    .select("id")
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: cardError?.message ?? "Insert failed" }, { status: 400 });
  }

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    const path = `${userData.user.id}/manual/${card.id}-${image.name}`;
    const buf = await image.arrayBuffer();
    await supabase.storage.from("card-images").upload(path, buf, { upsert: true });
    await supabase.from("cards").update({ image_path: path }).eq("id", card.id);
  }

  const { data: maxPos } = await supabase
    .from("collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("collection_entries").insert({
    collection_id: collectionId,
    card_id: card.id,
    position: (maxPos?.position ?? -1) + 1,
  });

  return NextResponse.json({ cardId: card.id });
}
