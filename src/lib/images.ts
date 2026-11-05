import { tcgdxImageUrl } from "@/lib/adapters/tcgdex";
import { getSupabaseUrl } from "@/lib/env";

export function publicStorageUrl(bucket: string, path: string) {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}

export function cardImageSrc(imagePath: string | null, imageUrl: string | null) {
  if (imagePath) return publicStorageUrl("card-images", imagePath);
  if (imageUrl) {
    if (imageUrl.includes("tcgdex.net") && !imageUrl.endsWith(".webp")) {
      return tcgdxImageUrl(imageUrl) ?? imageUrl;
    }
    return imageUrl;
  }
  return null;
}

export function coverImageSrc(coverPath: string | null) {
  if (!coverPath) return null;
  return publicStorageUrl("collection-covers", coverPath);
}
