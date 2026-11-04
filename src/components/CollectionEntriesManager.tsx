"use client";

import { createClient } from "@/lib/supabase/client";
import type { CollectionEntryWithCard } from "@/lib/types";
import { useState } from "react";

export function CollectionEntriesManager({
  collectionId,
  entries,
  onChanged,
}: {
  collectionId: string;
  entries: CollectionEntryWithCard[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  async function removeEntry(entryId: string) {
    if (!confirm("Remove this card from the collection?")) return;
    setBusy(entryId);
    const supabase = createClient();
    await supabase.from("collection_entries").delete().eq("id", entryId);
    setBusy(null);
    onChanged();
  }

  async function move(entryId: string, direction: -1 | 1) {
    const idx = sorted.findIndex((e) => e.id === entryId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    setBusy(entryId);
    const supabase = createClient();
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await supabase.from("collection_entries").update({ position: b.position }).eq("id", a.id);
    await supabase.from("collection_entries").update({ position: a.position }).eq("id", b.id);
    setBusy(null);
    onChanged();
  }

  if (collectionId.startsWith("demo-")) {
    return <p className="text-sm text-muted">Entry reorder/remove is disabled in demo mode.</p>;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
      {sorted.map((entry, idx) => (
        <div key={entry.id} className="flex items-center gap-2 text-sm">
          <span className="w-6 text-muted">{idx + 1}</span>
          <span className="min-w-0 flex-1 truncate">{entry.card.name}</span>
          <button
            type="button"
            className="btn-ghost px-2 py-0.5 text-xs"
            disabled={busy === entry.id || idx === 0}
            onClick={() => move(entry.id, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn-ghost px-2 py-0.5 text-xs"
            disabled={busy === entry.id || idx === sorted.length - 1}
            onClick={() => move(entry.id, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn-ghost px-2 py-0.5 text-xs text-red-400"
            disabled={busy === entry.id}
            onClick={() => removeEntry(entry.id)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
