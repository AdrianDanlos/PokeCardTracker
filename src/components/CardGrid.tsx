import { CardImage } from "@/components/CardImage";
import type { CollectionEntryWithCard } from "@/lib/types";

export function CardGrid({
  entries,
  onToggleOwned,
  onRemoveEntry,
}: {
  entries: CollectionEntryWithCard[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
  onRemoveEntry: (entry: CollectionEntryWithCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => {
        const owned = entry.owned;
        const stableKey = entry.card.external_id
          ? `${entry.card.source_id}:${entry.card.external_id}`
          : entry.id;
        return (
          <div
            key={stableKey}
            className={`flex h-full min-h-0 flex-col rounded-lg p-3 transition hover:border-accent/30 ${
              owned ? "card-tile-owned" : "card-tile-missing"
            }`}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              {owned ? (
                <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-black">
                  Owned
                </span>
              ) : (
                <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">
                  Missing
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${entry.card.name} from collection`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-black/30 hover:text-red-400"
                onClick={() => onRemoveEntry(entry)}
              >
                <span className="text-lg leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onToggleOwned(entry)}
              className="flex min-h-0 flex-1 flex-col text-left active:scale-[0.98]"
            >
              <CardImage
                imagePath={entry.card.image_path}
                imageUrl={entry.card.image_url}
                alt={entry.card.name}
                className="mb-3 aspect-[3/4] w-full shrink-0"
              />
              <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight">
                {entry.card.name}
              </p>
              <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-xs leading-snug text-muted">
                {entry.card.set?.name?.trim() || "—"}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}
