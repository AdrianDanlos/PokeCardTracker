import { cardImageSrc } from "@/lib/images";

export function CardImage({
  imagePath,
  imageUrl,
  alt,
  className = "",
}: {
  imagePath: string | null;
  imageUrl: string | null;
  alt: string;
  className?: string;
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
      <img
        src={src}
        alt={alt}
        className="h-full w-full select-none object-contain brightness-115 saturate-115"
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
}
