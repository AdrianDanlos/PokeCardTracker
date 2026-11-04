"use client";

import Image from "next/image";
import { cardImageSrc } from "@/lib/images";

export function CardImage({
  imagePath,
  imageUrl,
  alt,
  className = "",
  sizes = "(max-width: 768px) 50vw, 20vw",
}: {
  imagePath: string | null;
  imageUrl: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const src = cardImageSrc(imagePath, imageUrl);
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-md bg-black/30 text-xs text-muted ${className}`}
      >
        No image
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-md bg-black/30 ${className}`}>
      <Image src={src} alt={alt} fill className="object-contain" sizes={sizes} unoptimized={src.startsWith("/api/")} />
    </div>
  );
}
