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
  const row: Record<string, unknown> = {
    source_id: sourceId,
    external_id: result.externalId,
    set_id: setId,
    name: result.name,
    language: result.language,
    image_url: result.imageUrl,
    attrs: result.raw ?? {},
  };
  if (imagePath !== undefined) {
    row.image_path = imagePath;
  }
  const { data, error } = await supabase
    .from("cards")
    .upsert(row, { onConflict: "source_id,external_id" })
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
    const isWebp = fetchUrl.endsWith(".webp") || res.headers.get("content-type")?.includes("webp");
    const ext = imageUrl.includes(".png") ? "png" : isWebp ? "webp" : "jpg";
    const path = `${userId}/cached/${cardId}.${ext}`;
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const { error } = await supabase.storage.from("card-images").upload(path, buf, {
      upsert: true,
      contentType,
    });
    if (error) return null;
    await supabase.from("cards").update({ image_path: path }).eq("id", cardId);
    return path;
  } catch {
    return null;
  }
}
