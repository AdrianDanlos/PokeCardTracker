import { Link } from "react-router-dom";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { coverImageSrc } from "@/lib/images";
import type { CollectionProgressSummary } from "@/lib/types";

const GRADIENTS = [
  "from-rose-900/80 via-rose-950 to-surface",
  "from-teal-900/70 via-teal-950 to-surface",
  "from-emerald-900/60 via-emerald-950 to-surface",
  "from-violet-900/70 via-violet-950 to-surface",
];

export function CollectionCard({
  collection,
  index,
}: {
  collection: CollectionProgressSummary;
  index: number;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const cover = coverImageSrc(collection.cover_image_path);

  return (
    <Link
      to={`/collections/${collection.collection_id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/40"
    >
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${gradient}`}>
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-muted">Cover image</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground group-hover:text-accent">
            {collection.name}
          </h2>
          {collection.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{collection.description}</p>
          )}
        </div>
        <ProgressBar percent={Number(collection.owned_percent)} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {collection.owned_entries} / {collection.total_entries}
          </span>
          <span className="font-medium text-accent">{Math.round(Number(collection.owned_percent))}%</span>
        </div>
      </div>
    </Link>
  );
}
