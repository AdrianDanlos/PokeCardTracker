"use client";

import { CardImage } from "@/components/CardImage";
import type { CollectionEntryWithCard } from "@/lib/types";

export function CardGrid({
  entries,
  selectedId,
  onSelect,
}: {
  entries: CollectionEntryWithCard[];
  selectedId: string | null;
  onSelect: (entry: CollectionEntryWithCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => {
        const owned = entry.owned_quantity > 0;
        const selected = selectedId === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className={`relative flex flex-col rounded-lg p-3 text-left transition ${
              owned ? "card-tile-owned" : "card-tile-missing"
            } ${selected ? "ring-2 ring-accent" : "hover:border-accent/30"}`}
          >
            <CardImage
              imagePath={entry.card.image_path}
              imageUrl={entry.card.image_url}
              alt={entry.card.name}
              className="mb-3 aspect-[3/4] w-full"
            />
            <div className="space-y-0.5">
              <p className="line-clamp-2 text-sm font-medium leading-tight">{entry.card.name}</p>
              <p className="text-xs text-muted">
                {[entry.card.set?.name, entry.card.rarity].filter(Boolean).join(" · ")}
              </p>
            </div>
            {owned ? (
              <span className="absolute right-2 top-2 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-black">
                x{entry.owned_quantity}
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
