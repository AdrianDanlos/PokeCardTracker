"use client";

import { AddCardsModal } from "@/components/AddCardsModal";
import { BinderView } from "@/components/BinderView";
import { CardEditorDrawer } from "@/components/CardEditorDrawer";
import { CardGrid } from "@/components/CardGrid";
import { CollectionSettingsModal } from "@/components/CollectionSettingsModal";
import { StatsPanel } from "@/components/StatsPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { CollectionEntryWithCard, CollectionProgressSummary, ProgressBreakdown } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type FilterMode = "all" | "owned" | "missing";

export function CollectionViewClient({
  collection: initialCollection,
  initialEntries,
  breakdown,
  demo,
}: {
  collection: CollectionProgressSummary;
  initialEntries: CollectionEntryWithCard[];
  breakdown: ProgressBreakdown;
  demo: boolean;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "binder">("grid");
  const [showStats, setShowStats] = useState(false);
  const [selected, setSelected] = useState<CollectionEntryWithCard | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chips, setChips] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter === "owned") list = list.filter((e) => e.owned_quantity > 0);
    if (filter === "missing") list = list.filter((e) => e.owned_quantity === 0);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.card.name.toLowerCase().includes(q) ||
          (e.card.number?.toLowerCase().includes(q) ?? false),
      );
    }
    if (chips.includes("Holo")) list = list.filter((e) => e.card.rarity?.toLowerCase().includes("holo"));
    return list;
  }, [entries, filter, search, chips]);

  const owned = collection.owned_entries;
  const total = collection.total_entries;
  const pct = total ? Math.round((100 * owned) / total) : 0;

  function refreshEntry(updated: CollectionEntryWithCard) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    const newOwned = entries.map((e) => (e.id === updated.id ? updated : e)).filter((e) => e.owned_quantity > 0).length;
    setCollection((c) => ({
      ...c,
      owned_entries: newOwned,
      owned_percent: c.total_entries ? (100 * newOwned) / c.total_entries : 0,
    }));
  }

  function toggleChip(label: string) {
    setChips((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]));
  }

  async function exportCsv() {
    const res = await fetch(`/api/collections/${collection.collection_id}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <Link href="/" className="hover:text-accent">
          ← Collections
        </Link>
        {demo && <span className="text-accent/80">Demo mode</span>}
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{collection.name}</h1>
          {collection.description && <p className="mt-2 text-muted">{collection.description}</p>}
        </div>
        <div className="w-full max-w-sm space-y-2">
          <p className="text-right text-sm text-muted">
            {owned} / {total} owned · {pct}%
            {collection.goal_count ? ` · goal ${collection.goal_count}` : ""}
          </p>
          <ProgressBar percent={pct} />
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "owned", "missing"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`chip capitalize ${filter === f ? "chip-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`chip ${view === "grid" ? "chip-active" : ""}`} onClick={() => setView("grid")}>
            Grid
          </button>
          <button type="button" className={`chip ${view === "binder" ? "chip-active" : ""}`} onClick={() => setView("binder")}>
            Binder
          </button>
          <button type="button" className={`chip ${showStats ? "chip-active" : ""}`} onClick={() => setShowStats((s) => !s)}>
            Stats
          </button>
          <button type="button" className="btn-ghost" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button type="button" className="btn-ghost" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
            Add cards
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input max-w-md"
          placeholder="Search name or number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {["Source", "Rarity", "Language", "Variant"].map((label) => (
            <button
              key={label}
              type="button"
              className={`chip ${label === "Rarity" && chips.includes("Holo") ? "chip-active" : ""}`}
              onClick={() => label === "Rarity" && toggleChip("Holo")}
            >
              {label} ▾
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 ${showStats ? "lg:grid-cols-[1fr_280px]" : ""}`}>
        <div>
          {view === "grid" ? (
            <CardGrid entries={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
          ) : (
            <BinderView entries={filtered} />
          )}
        </div>
        {showStats && <StatsPanel breakdown={breakdown} />}
      </div>

      {selected && (
        <CardEditorDrawer entry={selected} onClose={() => setSelected(null)} onUpdated={refreshEntry} />
      )}
      {showAdd && (
        <AddCardsModal
          collectionId={collection.collection_id}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            window.location.reload();
          }}
        />
      )}
      {showSettings && (
        <CollectionSettingsModal
          collection={collection}
          onClose={() => setShowSettings(false)}
          onUpdated={setCollection}
        />
      )}
    </div>
  );
}
