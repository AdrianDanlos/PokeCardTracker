import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardSearchResult, CardSourceId } from "@/lib/types";

export async function upsertSetFromSearch(
  supabase: SupabaseClient,
  sourceId: CardSourceId,
  setExternalId: string | null,
  setName: string | null,
  language: string,
) {
  if (!setName) return null;
  const external_id = setExternalId ?? setName.toLowerCase().replace(/\s+/g, "-");
  const { data, error } = await supabase
    .from("sets")
    .upsert(
      {
        source_id: sourceId,
        external_id,
        name: setName,
        language,
      },
      { onConflict: "source_id,external_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function upsertCardFromSearch(
  supabase: SupabaseClient,
  sourceId: CardSourceId,
  result: CardSearchResult,
  setId: string | null,
  imagePath?: string | null,
) {
  const { data, error } = await supabase
    .from("cards")
    .upsert(
      {
        source_id: sourceId,
        external_id: result.externalId,
        set_id: setId,
        number: result.number,
        name: result.name,
        rarity: result.rarity,
        language: result.language,
        edition: result.edition,
        variant: result.variant,
        category: result.category,
        image_url: result.imageUrl,
        image_path: imagePath ?? null,
        attrs: result.raw ?? {},
      },
      { onConflict: "source_id,external_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function cacheRemoteImage(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    let fetchUrl = imageUrl;
    if (fetchUrl.includes("tcgdex.net") && !fetchUrl.endsWith(".webp")) {
      fetchUrl = `${fetchUrl.replace(/\/$/, "")}/high.webp`;
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ext = imageUrl.includes(".png") ? "png" : "jpg";
    const path = `${userId}/cached/${cardId}.${ext}`;
    const { error } = await supabase.storage.from("card-images").upload(path, buf, {
      upsert: true,
      contentType: ext === "png" ? "image/png" : "image/jpeg",
    });
    if (error) return null;
    await supabase.from("cards").update({ image_path: path }).eq("id", cardId);
    return path;
  } catch {
    return null;
  }
}
