"use client";

import type { CollectionEntryWithCard } from "@/lib/types";
import { useMemo, useState } from "react";

const PAGE_SIZE = 9;

export function BinderView({
  entries,
  onSelect,
}: {
  entries: CollectionEntryWithCard[];
  onSelect?: (entry: CollectionEntryWithCard) => void;
}) {
  const pages = useMemo(() => {
    const chunks: CollectionEntryWithCard[][] = [];
    for (let i = 0; i < entries.length; i += PAGE_SIZE) {
      chunks.push(entries.slice(i, i + PAGE_SIZE));
    }
    return chunks.length ? chunks : [[]];
  }, [entries]);

  const [page, setPage] = useState(0);
  const current = pages[page] ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface p-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => {
          const entry = current[i];
          if (!entry) {
            return <div key={i} className="aspect-[3/4] rounded-md border border-dashed border-border" />;
          }
          const owned = entry.owned_quantity > 0;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect?.(entry)}
              className={`relative flex aspect-[3/4] flex-col items-center justify-center rounded-md p-2 text-center text-xs ${
                owned ? "card-tile-owned" : "card-tile-missing"
              }`}
            >
              <span className="line-clamp-3 font-medium">{entry.card.name}</span>
              {owned && (
                <span className="absolute right-1 top-1 rounded bg-accent px-1 text-[10px] font-bold text-black">
                  x{entry.owned_quantity}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <button
          type="button"
          className="btn-ghost py-1"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous page
        </button>
        <span>
          Page {page + 1} / {pages.length}
        </span>
        <button
          type="button"
          className="btn-ghost py-1"
          disabled={page >= pages.length - 1}
          onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
        >
          Next page
        </button>
      </div>
    </div>
  );
}
