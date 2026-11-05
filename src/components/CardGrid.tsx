"use client";

import { CardImage } from "@/components/CardImage";
import type { CollectionEntryWithCard } from "@/lib/types";

export function CardGrid({
  entries,
  onToggleOwned,
}: {
  entries: CollectionEntryWithCard[];
  onToggleOwned: (entry: CollectionEntryWithCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => {
        const owned = entry.owned;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onToggleOwned(entry)}
            className={`relative flex flex-col rounded-lg p-3 text-left transition hover:border-accent/30 active:scale-[0.98] ${
              owned ? "card-tile-owned" : "card-tile-missing"
            }`}
          >
            <CardImage
              imagePath={entry.card.image_path}
              imageUrl={entry.card.image_url}
              alt={entry.card.name}
              className="mb-3 aspect-[3/4] w-full"
            />
            <p className="line-clamp-2 text-sm font-medium leading-tight">{entry.card.name}</p>
            {owned ? (
              <span className="absolute right-2 top-2 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-black">
                Owned
              </span>
            ) : (
              <span className="absolute right-2 top-2 rounded border border-border px-1.5 py-0.5 text-xs text-muted">
                Missing
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
