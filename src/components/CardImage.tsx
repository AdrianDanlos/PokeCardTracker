import { cardImageSrc } from "@/lib/images";

export function CardImage({
  imagePath,
  imageUrl,
  alt,
  className = "",
  dimmed = false,
}: {
  imagePath: string | null;
  imageUrl: string | null;
  alt: string;
  className?: string;
  /** Missing / not-owned cards — same dim in grid and binder. */
  dimmed?: boolean;
}) {
  const src = cardImageSrc(imagePath, imageUrl);
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-md bg-black/30 text-xs text-muted ${dimmed ? "card-image-dimmed" : ""} ${className}`}
      >
        No image
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-black/30 ${dimmed ? "card-image-dimmed" : ""} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className={`h-full w-full select-none object-contain ${dimmed ? "" : "brightness-115 saturate-115"}`}
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
}
