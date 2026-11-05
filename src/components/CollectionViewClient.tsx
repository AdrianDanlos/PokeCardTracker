import { AddCardsModal } from "@/components/AddCardsModal";
import { CardGrid } from "@/components/CardGrid";
import { CollectionSettingsModal } from "@/components/CollectionSettingsModal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { removeEntryFromCollection } from "@/lib/api/collection-entries";
import { setCardOwned } from "@/lib/api/owned";
import { downloadTextFile, exportCollectionOrderJson } from "@/lib/collection-order-json";
import type { CollectionEntryWithCard, CollectionProgressSummary } from "@/lib/types";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

type FilterMode = "all" | "owned" | "missing";

export function CollectionViewClient({
  collection: initialCollection,
  initialEntries,
  onReload,
  initialSearch = "",
}: {
  collection: CollectionProgressSummary;
  initialEntries: CollectionEntryWithCard[];
  onReload: () => void;
  initialSearch?: string;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    setCollection(initialCollection);
  }, [initialCollection]);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState(initialSearch);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const filtered = useMemo(() => {
    let list = entries;
    if (filter === "owned") list = list.filter((e) => e.owned);
    if (filter === "missing") list = list.filter((e) => !e.owned);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => e.card.name.toLowerCase().includes(q));
    }
    return list;
  }, [entries, filter, search]);

  const owned = collection.owned_entries;
  const total = collection.total_entries;
  const pct = total ? Math.round((100 * owned) / total) : 0;

  function applyOwnedToEntries(cardId: string, owned: boolean, language: string | null) {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.card_id === cardId ? { ...e, owned, owned_language: language } : e,
      );
      const ownedCount = next.filter((e) => e.owned).length;
      setCollection((c) => ({
        ...c,
        owned_entries: ownedCount,
        owned_percent: c.total_entries ? (100 * ownedCount) / c.total_entries : 0,
      }));
      return next;
    });
  }

  function applyRemoveEntry(entryId: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entryId);
      const ownedCount = next.filter((e) => e.owned).length;
      const totalCount = next.length;
      setCollection((c) => ({
        ...c,
        total_entries: totalCount,
        owned_entries: ownedCount,
        owned_percent: totalCount ? (100 * ownedCount) / totalCount : 0,
      }));
      return next;
    });
  }

  function removeEntry(entry: CollectionEntryWithCard) {
    applyRemoveEntry(entry.id);

    if (collection.collection_id.startsWith("demo-")) return;

    void removeEntryFromCollection(entry.id).catch(() => {
      onReload();
    });
  }

  function toggleOwned(entry: CollectionEntryWithCard) {
    const nextOwned = !entry.owned;
    const language = entry.owned_language ?? entry.card.language;
    const prevOwned = entry.owned;
    const prevLanguage = entry.owned_language;

    applyOwnedToEntries(entry.card_id, nextOwned, nextOwned ? language : null);

    if (collection.collection_id.startsWith("demo-")) return;

    void setCardOwned(entry.card_id, nextOwned, language).catch(() => {
      applyOwnedToEntries(entry.card_id, prevOwned, prevLanguage);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <Link to="/" className="hover:text-accent">
          ← Collections
        </Link>
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
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const json = exportCollectionOrderJson(entries);
              const slug = collection.name.replace(/[^\w\-]+/g, "-").toLowerCase() || "collection";
              downloadTextFile(`${slug}-cards.json`, json);
            }}
          >
            Export names
          </button>
          <button type="button" className="btn-ghost" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
            Add cards
          </button>
        </div>
      </div>

      <div className="max-w-md">
        <input
          className="input w-full"
          placeholder="Search name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onReload()}
        />
      </div>

      <CardGrid entries={filtered} onToggleOwned={toggleOwned} onRemoveEntry={removeEntry} />

      {showAdd && (
        <AddCardsModal
          collectionId={collection.collection_id}
          collectionName={collection.name}
          onClose={() => setShowAdd(false)}
          onAdded={onReload}
        />
      )}
      {showSettings && (
        <CollectionSettingsModal
          collection={collection}
          entries={entries}
          onClose={() => setShowSettings(false)}
          onUpdated={setCollection}
          onEntriesChanged={onReload}
        />
      )}
    </div>
  );
}
