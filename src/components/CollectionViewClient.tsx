import { AddCardsModal, type CatalogSearchRow } from "@/components/AddCardsModal";
import { CardGrid } from "@/components/CardGrid";
import { CollectionSettingsModal } from "@/components/CollectionSettingsModal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  removeEntryFromCollection,
  reorderCollectionEntries,
} from "@/lib/api/collection-entries";
import { setCardOwned } from "@/lib/api/owned";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { clampCollectionDescription } from "@/lib/collection-limits";
import { matchesCollectionEntrySearch } from "@/lib/collection-entry-search";
import type { CollectionEntryWithCard, CollectionProgressSummary } from "@/lib/types";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

type FilterMode = "all" | "owned" | "missing";

export function CollectionViewClient({
  collection: initialCollection,
  initialEntries,
  reloadSeq = 0,
  onReload,
  onCollectionDeleted,
  onCollectionUpdated,
  initialSearch = "",
}: {
  collection: CollectionProgressSummary;
  initialEntries: CollectionEntryWithCard[];
  /** Bumps after an explicit refetch so we do not overwrite local optimistic UI on background query updates. */
  reloadSeq?: number;
  onReload: () => void | Promise<void>;
  onCollectionDeleted?: () => void;
  onCollectionUpdated?: () => void;
  initialSearch?: string;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    if (reloadSeq === 0) return;
    setCollection(initialCollection);
    setEntries(initialEntries);
  }, [reloadSeq, initialCollection, initialEntries]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState(initialSearch);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const orderedEntries = useMemo(
    () => [...entries].sort((a, b) => a.position - b.position),
    [entries],
  );
  const filtered = useMemo(() => {
    let list = orderedEntries;
    if (filter === "owned") list = list.filter((e) => e.owned);
    if (filter === "missing") list = list.filter((e) => !e.owned);
    if (search.trim()) {
      list = list.filter((e) => matchesCollectionEntrySearch(e, search));
    }
    return list;
  }, [orderedEntries, filter, search]);

  const sortable = filter === "all" && !search.trim();

  function reorderEntries(orderedIds: string[]) {
    const byId = new Map(entries.map((e) => [e.id, e]));
    const reordered = orderedIds.map((id, position) => {
      const entry = byId.get(id);
      if (!entry) throw new Error(`Unknown entry ${id}`);
      return { ...entry, position };
    });
    const prev = entries;
    setEntries(reordered);

    if (collection.collection_id.startsWith("demo-")) return;

    const updates = reordered
      .filter((e) => prev.find((p) => p.id === e.id)?.position !== e.position)
      .map((e) => ({ id: e.id, position: e.position }));

    void reorderCollectionEntries(updates).catch(() => {
      setEntries(prev);
      void onReload();
    });
  }

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

  function applyOptimisticCatalogAdd(row: CatalogSearchRow) {
    setEntries((prev) => {
      if (prev.some((e) => e.card.external_id === row.externalId)) return prev;
      const position = prev.length ? Math.max(...prev.map((e) => e.position)) + 1 : 0;
      const tempKey = `optimistic-${row.externalId}`;
      const entry: CollectionEntryWithCard = {
        id: tempKey,
        collection_id: collection.collection_id,
        card_id: tempKey,
        position,
        owned: false,
        owned_language: null,
        card: {
          id: tempKey,
          source_id: "tcgdex",
          external_id: row.externalId,
          set_id: null,
          name: row.name,
          language: "en",
          image_path: null,
          image_url: row.imageUrl,
          attrs: {},
          set: row.setName
            ? {
                id: `${tempKey}-set`,
                source_id: "tcgdex",
                external_id: null,
                name: row.setName,
                series: null,
                language: "en",
                release_date: null,
                image_path: null,
              }
            : null,
        },
      };
      const next = [...prev, entry];
      setCollection((c) => ({
        ...c,
        total_entries: next.length,
        owned_percent: c.total_entries ? (100 * c.owned_entries) / next.length : 0,
      }));
      return next;
    });
  }

  function revertOptimisticCatalogAdd(externalId: string) {
    const tempKey = `optimistic-${externalId}`;
    applyRemoveEntry(tempKey);
  }

  function commitOptimisticCatalogAdd(
    externalId: string,
    ids: { cardId: string; entryId?: string; imagePath?: string | null },
  ) {
    const tempKey = `optimistic-${externalId}`;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== tempKey && e.card.external_id !== externalId) return e;
        if (e.card.external_id !== externalId) return e;
        return {
          ...e,
          id: ids.entryId ?? e.id,
          card_id: ids.cardId,
          card: {
            ...e.card,
            id: ids.cardId,
            // Keep showing TCGdex URL locally to avoid img src swap when cache finishes (~few seconds).
            image_path: e.card.image_url
              ? e.card.image_path
              : (ids.imagePath ?? e.card.image_path),
          },
        };
      }),
    );
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

      <header className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-3xl font-bold">{collection.name}</h1>
          <p className="text-sm text-muted">
            {owned} / {total} owned · {pct}%
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
          <p className="min-w-0 flex-1 whitespace-pre-line text-muted">
            {collection.description
              ? clampCollectionDescription(collection.description.trim())
              : "\u00A0"}
          </p>
          <div className="w-full shrink-0 sm:max-w-md">
            <ProgressBar percent={pct} />
          </div>
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
          placeholder="Search name or set"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onReload()}
        />
      </div>

      <CardGrid
        entries={filtered}
        onToggleOwned={toggleOwned}
        onRemoveEntry={removeEntry}
        sortable={sortable}
        onReorder={sortable ? reorderEntries : undefined}
      />

      {showAdd && (
        <AddCardsModal
          collectionId={collection.collection_id}
          collectionName={collection.name}
          onClose={() => setShowAdd(false)}
          onAdded={onReload}
          onOptimisticCardAdd={applyOptimisticCatalogAdd}
          onOptimisticCardAddRevert={revertOptimisticCatalogAdd}
          onCardAddCommitted={commitOptimisticCatalogAdd}
        />
      )}
      {showSettings && (
        <CollectionSettingsModal
          collection={collection}
          onClose={() => setShowSettings(false)}
          onUpdated={setCollection}
          onSaved={() => onCollectionUpdated?.()}
          onSaveFailed={(previous, message) => {
            setCollection(previous);
            setSettingsSaveError(message);
          }}
          onDeleted={onCollectionDeleted}
        />
      )}
      <AlertDialog
        open={settingsSaveError != null}
        title="Could not save settings"
        description={settingsSaveError ?? ""}
        onClose={() => setSettingsSaveError(null)}
      />
    </div>
  );
}
