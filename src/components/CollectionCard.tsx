import { Link } from "react-router-dom";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { coverImageSrc } from "@/lib/images";
import { clampCollectionDescription } from "@/lib/collection-limits";
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
  onDelete,
  deleting,
}: {
  collection: CollectionProgressSummary;
  index: number;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const cover = coverImageSrc(collection.cover_image_path);
  const canDelete = onDelete && !collection.collection_id.startsWith("demo-");

  return (
    <div className="relative h-full">
      {canDelete && (
        <button
          type="button"
          aria-label={`Delete ${collection.name}`}
          disabled={deleting}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-black/50 text-lg text-muted transition hover:bg-black/70 hover:text-red-400 disabled:opacity-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </button>
      )}
      <Link
        to={`/collections/${collection.collection_id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/40"
      >
      <div className={`relative flex h-36 shrink-0 items-center justify-center bg-gradient-to-br ${gradient}`}>
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-muted">Cover image</span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground group-hover:text-accent">
          {collection.name}
        </h2>
        <div className="flex items-start gap-3">
          <p className="line-clamp-2 min-w-0 flex-1 whitespace-pre-line text-sm leading-snug text-muted">
            {clampCollectionDescription(collection.description?.trim() ?? "") || "\u00A0"}
          </p>
          <div className="w-[5.5rem] shrink-0">
            <ProgressBar percent={Number(collection.owned_percent)} />
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-sm">
          <span className="text-muted">
            {collection.owned_entries} / {collection.total_entries}
          </span>
          <span className="font-medium text-accent">{Math.round(Number(collection.owned_percent))}%</span>
        </div>
      </div>
    </Link>
    </div>
  );
}
