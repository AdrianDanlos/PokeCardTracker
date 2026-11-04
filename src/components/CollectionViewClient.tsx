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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FilterMode = "all" | "owned" | "missing";

type FilterKey = "source" | "rarity" | "language" | "variant";

export function CollectionViewClient({
  collection: initialCollection,
  initialEntries,
  breakdown,
  demo,
  requiresAuth,
  initialSearch = "",
}: {
  collection: CollectionProgressSummary;
  initialEntries: CollectionEntryWithCard[];
  breakdown: ProgressBreakdown;
  demo: boolean;
  requiresAuth?: boolean;
  initialSearch?: string;
}) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState(initialSearch);
  const [view, setView] = useState<"grid" | "binder">("grid");
  const [showStats, setShowStats] = useState(false);
  const [selected, setSelected] = useState<CollectionEntryWithCard | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilterMenu, setActiveFilterMenu] = useState<FilterKey | null>(null);
  const [filters, setFilters] = useState<{
    source: string[];
    rarity: string[];
    language: string[];
    variant: string[];
  }>({ source: [], rarity: [], language: [], variant: [] });

  const filterOptions = useMemo(() => {
    const source = new Set<string>();
    const rarity = new Set<string>();
    const language = new Set<string>();
    const variant = new Set<string>();
    for (const e of entries) {
      source.add(e.card.source_id);
      if (e.card.rarity) rarity.add(e.card.rarity);
      language.add(e.card.language);
      const v = e.card.variant ?? e.owned_copy?.variant;
      if (v) variant.add(v);
      else variant.add("(none)");
    }
    return {
      source: [...source].sort(),
      rarity: [...rarity].sort(),
      language: [...language].sort(),
      variant: [...variant].sort(),
    };
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter === "owned") list = list.filter((e) => e.owned_quantity > 0);
    if (filter === "missing") list = list.filter((e) => e.owned_quantity === 0);
    const q = search.trim().toLowerCase();
    if (q && demo) {
      list = list.filter(
        (e) =>
          e.card.name.toLowerCase().includes(q) ||
          (e.card.number?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filters.source.length) {
      list = list.filter((e) => filters.source.includes(e.card.source_id));
    }
    if (filters.rarity.length) {
      list = list.filter((e) => e.card.rarity && filters.rarity.includes(e.card.rarity));
    }
    if (filters.language.length) {
      list = list.filter((e) => filters.language.includes(e.card.language));
    }
    if (filters.variant.length) {
      list = list.filter((e) => {
        const v = e.card.variant ?? e.owned_copy?.variant ?? "(none)";
        return filters.variant.includes(v);
      });
    }
    return list;
  }, [entries, filter, search, filters, demo]);

  const owned = collection.owned_entries;
  const total = collection.total_entries;
  const pct = total ? Math.round((100 * owned) / total) : 0;

  function refreshEntry(updated: CollectionEntryWithCard) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    const newOwned = entries
      .map((e) => (e.id === updated.id ? updated : e))
      .filter((e) => e.owned_quantity > 0).length;
    setCollection((c) => ({
      ...c,
      owned_entries: newOwned,
      owned_percent: c.total_entries ? (100 * newOwned) / c.total_entries : 0,
    }));
  }

  function toggleFilterValue(key: FilterKey, value: string) {
    setFilters((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: [...set] };
    });
  }

  function applyServerSearch() {
    if (demo) return;
    const q = search.trim();
    const url = q
      ? `/collections/${collection.collection_id}?q=${encodeURIComponent(q)}`
      : `/collections/${collection.collection_id}`;
    router.push(url);
    router.refresh();
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

  if (requiresAuth) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-muted">Sign in to view this collection.</p>
        <Link href="/login" className="btn-primary mt-4 inline-block">
          Magic link login
        </Link>
      </div>
    );
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
        <div className="flex max-w-md flex-1 gap-2">
          <input
            className="input"
            placeholder="Search name or number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyServerSearch()}
          />
          {!demo && (
            <button type="button" className="btn-ghost whitespace-nowrap" onClick={applyServerSearch}>
              DB search
            </button>
          )}
        </div>
        <div className="relative flex flex-wrap gap-2">
          {(["source", "rarity", "language", "variant"] as const).map((key) => (
            <div key={key} className="relative">
              <button
                type="button"
                className={`chip capitalize ${filters[key].length ? "chip-active" : ""}`}
                onClick={() => setActiveFilterMenu((m) => (m === key ? null : key))}
              >
                {key} {filters[key].length ? `(${filters[key].length})` : ""} ▾
              </button>
              {activeFilterMenu === key && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-48 min-w-[160px] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-2 shadow-lg">
                  {filterOptions[key].map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={filters[key].includes(opt)}
                        onChange={() => toggleFilterValue(key, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 ${showStats ? "lg:grid-cols-[1fr_280px]" : ""}`}>
        <div>
          {view === "grid" ? (
            <CardGrid entries={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
          ) : (
            <BinderView entries={filtered} onSelect={setSelected} />
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
          entries={entries}
          onClose={() => setShowSettings(false)}
          onUpdated={setCollection}
          onEntriesChanged={() => {
            router.refresh();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
