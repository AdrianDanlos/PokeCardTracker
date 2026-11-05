import {
  AddCardsModal,
  type CatalogSearchRow,
} from "@/components/AddCardsModal";
import { CardGrid } from "@/components/CardGrid";
import { CollectionLoadingScreen } from "@/components/CollectionLoadingScreen";
import { EditCardModal } from "@/components/EditCardModal";
import { CollectionSettingsModal } from "@/components/CollectionSettingsModal";
import { ReorderCollectionModal } from "@/components/ReorderCollectionModal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  removeEntryFromCollection,
  reorderCollectionEntries,
} from "@/lib/api/collection-entries";
import { setCardOwned } from "@/lib/api/owned";
import { importTcgplayerSet } from "@/lib/api/tcgplayer-set";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { clampCollectionDescription } from "@/lib/collection-limits";
import {
  importJsonSetToCollection,
  type JsonSetImportCardCommitted,
  type JsonSetImportCardPreview,
  type JsonSetImportUnresolved,
} from "@/lib/api/cards";
import { matchesCollectionEntrySearch } from "@/lib/collection-entry-search";
import type { JsonSetImportGroup } from "@/lib/json-set-import";
import {
  DEFAULT_CARD_LANGUAGE,
  type CollectionEntryWithCard,
  type CollectionProgressSummary,
} from "@/lib/types";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

type FilterMode = "all" | "owned" | "missing";

export function CollectionViewClient({
  collection: initialCollection,
  initialEntries,
  cardsLoading = false,
  cardsError = null,
  reloadSeq = 0,
  onReload,
  onCollectionDeleted,
  onCollectionUpdated,
  initialSearch = "",
}: {
  collection: CollectionProgressSummary | null;
  initialEntries: CollectionEntryWithCard[];
  /** True while card entries are still being fetched. Page chrome stays visible. */
  cardsLoading?: boolean;
  cardsError?: string | null;
  /** Bumps after an explicit refetch so we do not overwrite local optimistic UI on background query updates. */
  reloadSeq?: number;
  onReload: () => void | Promise<void>;
  onCollectionDeleted?: () => void;
  onCollectionUpdated?: () => void;
  initialSearch?: string;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [entries, setEntries] = useState(initialEntries);
  const [seenCardsLoading, setSeenCardsLoading] = useState(cardsLoading);
  if (seenCardsLoading !== cardsLoading) {
    setSeenCardsLoading(cardsLoading);
    if (!cardsLoading && initialCollection) {
      setCollection(initialCollection);
      setEntries(initialEntries);
    }
  }
  if (!collection && initialCollection) {
    setCollection(initialCollection);
  }

  useEffect(() => {
    if (reloadSeq === 0) return;
    setCollection(initialCollection);
    setEntries(initialEntries);
  }, [reloadSeq, initialCollection, initialEntries]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState(initialSearch);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [editEntry, setEditEntry] = useState<CollectionEntryWithCard | null>(
    null,
  );
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(
    null,
  );
  const [jsonImportProgress, setJsonImportProgress] = useState<string | null>(
    null,
  );
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [jsonImportUnresolved, setJsonImportUnresolved] = useState<{
    imported: number;
    unresolved: JsonSetImportUnresolved[];
  } | null>(null);
  const [cardImageUploadError, setCardImageUploadError] = useState<
    string | null
  >(null);
  const jsonImportOptimisticKeysRef = useRef<string[]>([]);
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

  function applyCardDisplayUpdate(
    cardId: string,
    card: CollectionEntryWithCard["card"],
  ) {
    setEntries((prev) =>
      prev.map((e) =>
        e.card_id === cardId ? { ...e, card: { ...e.card, ...card } } : e,
      ),
    );
  }

  function reorderEntries(orderedIds: string[]) {
    const byId = new Map(entries.map((e) => [e.id, e]));
    const reordered = orderedIds.map((id, position) => {
      const entry = byId.get(id);
      if (!entry) throw new Error(`Unknown entry ${id}`);
      return { ...entry, position };
    });
    const prev = entries;
    setEntries(reordered);

    if (!collection || collection.collection_id.startsWith("demo-")) return;

    const updates = reordered
      .filter((e) => prev.find((p) => p.id === e.id)?.position !== e.position)
      .map((e) => ({ id: e.id, position: e.position }));

    void reorderCollectionEntries(updates).catch(() => {
      setEntries(prev);
      void onReload();
    });
  }

  const headerCollection = collection ?? initialCollection;
  const hasOptimisticEntries = entries.some((e) => e.id.startsWith("optimistic-"));
  const canReorderWithAi =
    !cardsLoading &&
    !!headerCollection &&
    orderedEntries.length > 0 &&
    !hasOptimisticEntries;
  const owned = headerCollection?.owned_entries ?? 0;
  const total = headerCollection?.total_entries ?? 0;
  const pct = total ? Math.round((100 * owned) / total) : 0;

  function applyOwnedToEntries(
    cardId: string,
    owned: boolean,
    language: string | null,
  ) {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.card_id === cardId ? { ...e, owned, owned_language: language } : e,
      );
      const ownedCount = next.filter((e) => e.owned).length;
      setCollection((c) => {
        if (!c) return c;
        return {
          ...c,
          owned_entries: ownedCount,
          owned_percent: c.total_entries
            ? (100 * ownedCount) / c.total_entries
            : 0,
        };
      });
      return next;
    });
  }

  function applyRemoveEntry(entryId: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entryId);
      const ownedCount = next.filter((e) => e.owned).length;
      const totalCount = next.length;
      setCollection((c) => {
        if (!c) return c;
        return {
          ...c,
          total_entries: totalCount,
          owned_entries: ownedCount,
          owned_percent: totalCount ? (100 * ownedCount) / totalCount : 0,
        };
      });
      return next;
    });
  }

  function applyOptimisticCatalogAdd(row: CatalogSearchRow) {
    if (!collection) return;
    const collectionId = collection.collection_id;
    setEntries((prev) => {
      if (prev.some((e) => e.card.external_id === row.externalId)) return prev;
      const position = prev.length
        ? Math.max(...prev.map((e) => e.position)) + 1
        : 0;
      const tempKey = `optimistic-${row.externalId}`;
      const entry: CollectionEntryWithCard = {
        id: tempKey,
        collection_id: collectionId,
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
      setCollection((c) => {
        if (!c) return c;
        return {
          ...c,
          total_entries: next.length,
          owned_percent: c.total_entries
            ? (100 * c.owned_entries) / next.length
            : 0,
        };
      });
      return next;
    });
  }

  function revertOptimisticCatalogAdd(externalId: string) {
    const tempKey = `optimistic-${externalId}`;
    applyRemoveEntry(tempKey);
  }

  function applyOptimisticJsonImportPreview(preview: JsonSetImportCardPreview) {
    if (!collection) return;
    const collectionId = collection.collection_id;
    setEntries((prev) => {
      if (prev.some((e) => e.id === preview.tempKey)) return prev;
      const position = prev.length
        ? Math.max(...prev.map((e) => e.position)) + 1
        : 0;
      const entry: CollectionEntryWithCard = {
        id: preview.tempKey,
        collection_id: collectionId,
        card_id: preview.tempKey,
        position,
        owned: false,
        owned_language: null,
        card: {
          id: preview.tempKey,
          source_id: "manual",
          external_id: null,
          set_id: null,
          name: preview.name,
          language: DEFAULT_CARD_LANGUAGE,
          image_path: null,
          image_url: preview.imageUrl,
          attrs: {},
          set: {
            id: `${preview.tempKey}-set`,
            source_id: "manual",
            external_id: null,
            name: preview.setLabel,
            series: null,
            language: DEFAULT_CARD_LANGUAGE,
            release_date: null,
            image_path: null,
          },
        },
      };
      const next = [...prev, entry];
      setCollection((c) => {
        if (!c) return c;
        return {
          ...c,
          total_entries: next.length,
          owned_percent: c.total_entries
            ? (100 * c.owned_entries) / next.length
            : 0,
        };
      });
      return next;
    });
  }

  function revertOptimisticJsonImport(tempKey: string) {
    applyRemoveEntry(tempKey);
  }

  function commitOptimisticJsonImport(committed: JsonSetImportCardCommitted) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== committed.tempKey) return e;
        return {
          ...e,
          id: committed.entryId,
          card_id: committed.cardId,
          card: {
            ...e.card,
            id: committed.cardId,
            image_path: e.card.image_url
              ? e.card.image_path
              : (committed.imagePath ?? e.card.image_path),
          },
        };
      }),
    );
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

  async function runJsonImport(groups: JsonSetImportGroup[]) {
    if (!collection || collection.collection_id.startsWith("demo-")) return;
    jsonImportOptimisticKeysRef.current = [];
    setJsonImportError(null);
    setJsonImportUnresolved(null);
    setJsonImportProgress("Importing cards…");
    try {
      const result = await importJsonSetToCollection(
        groups,
        collection.collection_id,
        {
          onProgress: (done, total) => {
            setJsonImportProgress(`Importing cards & photos… ${done}/${total}`);
          },
          onCardResolved: (preview) => {
            jsonImportOptimisticKeysRef.current.push(preview.tempKey);
            applyOptimisticJsonImportPreview(preview);
          },
          onCardCommitted: (committed) => {
            commitOptimisticJsonImport(committed);
          },
        },
      );
      await onReload();
      if (result.unresolved.length > 0) {
        setJsonImportUnresolved(result);
      }
    } catch (e) {
      for (const tempKey of jsonImportOptimisticKeysRef.current) {
        revertOptimisticJsonImport(tempKey);
      }
      jsonImportOptimisticKeysRef.current = [];
      setJsonImportError(e instanceof Error ? e.message : "Import failed");
      void onReload();
    } finally {
      setJsonImportProgress(null);
    }
  }

  function removeEntry(entry: CollectionEntryWithCard) {
    applyRemoveEntry(entry.id);

    if (!collection || collection.collection_id.startsWith("demo-")) return;

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

    if (!collection || collection.collection_id.startsWith("demo-")) return;

    void setCardOwned(entry.card_id, nextOwned, language).catch(() => {
      applyOwnedToEntries(entry.card_id, prevOwned, prevLanguage);
    });
  }

  async function runTcgplayerImport(setName: string) {
    if (!collection) return;
    setJsonImportError(null);
    setJsonImportProgress(`Fetching ${setName} from TCGPlayer…`);
    try {
      const result = await importTcgplayerSet(
        collection.collection_id,
        setName,
      );
      setJsonImportProgress(
        result.added > 0
          ? `Added ${result.added} cards from ${result.setName}.`
          : `All ${result.total} cards from ${result.setName} were already in this collection.`,
      );
      await onReload();
    } catch (e) {
      setJsonImportError(
        e instanceof Error ? e.message : "TCGPlayer import failed",
      );
    } finally {
      window.setTimeout(() => setJsonImportProgress(null), 2500);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <Link to="/" className="hover:text-accent">
          ← Collections
        </Link>
      </div>

      <header className="space-y-3">
        {headerCollection ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h1 className="text-3xl font-bold">{headerCollection.name}</h1>
              <p className="text-sm text-muted">
                {owned} / {total} owned · {pct}%
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
              <p className="min-w-0 flex-1 whitespace-pre-line text-muted">
                {headerCollection.description
                  ? clampCollectionDescription(
                      headerCollection.description.trim(),
                    )
                  : "\u00A0"}
              </p>
              <div className="w-full shrink-0 sm:max-w-md">
                <ProgressBar percent={pct} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="h-9 w-56 max-w-full animate-pulse rounded bg-surface-elevated" />
              <div className="h-4 w-36 animate-pulse rounded bg-surface-elevated" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="h-5 min-w-0 flex-1 animate-pulse rounded bg-surface-elevated" />
              <div className="h-1.5 w-full shrink-0 animate-pulse rounded-full bg-surface-elevated sm:max-w-md" />
            </div>
          </>
        )}
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "owned", "missing"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`chip capitalize disabled:cursor-not-allowed disabled:opacity-50 ${filter === f ? "chip-active" : ""}`}
              disabled={cardsLoading}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cardsLoading || !headerCollection}
            onClick={() => setShowSettings(true)}
          >
            Settings
          </button>
          <button
            type="button"
            className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canReorderWithAi}
            onClick={() => setShowOrder(true)}
          >
            Order
          </button>
          <button
            type="button"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cardsLoading || !headerCollection}
            onClick={() => setShowAdd(true)}
          >
            Add cards
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[12rem] max-w-md flex-1">
          <input
            className="input w-full disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search name or set"
            value={search}
            disabled={cardsLoading}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onReload()}
          />
        </div>
        {search.trim() && !cardsLoading ? (
          <p className="text-sm text-muted tabular-nums">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </p>
        ) : null}
      </div>

      {cardsLoading ? (
        <CollectionLoadingScreen />
      ) : cardsError ? (
        <p className="py-10 text-center text-red-400">{cardsError}</p>
      ) : collection ? (
        <CardGrid
          entries={filtered}
          onToggleOwned={toggleOwned}
          onRemoveEntry={removeEntry}
          onEditEntry={
            collection.collection_id.startsWith("demo-")
              ? undefined
              : setEditEntry
          }
          sortable={sortable}
          onReorder={sortable ? reorderEntries : undefined}
        />
      ) : null}

      {editEntry && (
        <EditCardModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={(card) => {
            applyCardDisplayUpdate(editEntry.card_id, card);
            setEditEntry(null);
          }}
          onImageUploadFailed={(message) => setCardImageUploadError(message)}
        />
      )}
      {jsonImportProgress && (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-muted shadow-lg"
          role="status"
          aria-live="polite"
        >
          {jsonImportProgress}
        </div>
      )}
      {showAdd && collection && (
        <AddCardsModal
          collectionId={collection.collection_id}
          onClose={() => setShowAdd(false)}
          onAdded={onReload}
          onJsonImportStart={(groups) => void runJsonImport(groups)}
          onTcgplayerImportStart={(setName) => void runTcgplayerImport(setName)}
          onOptimisticCardAdd={applyOptimisticCatalogAdd}
          onOptimisticCardAddRevert={revertOptimisticCatalogAdd}
          onCardAddCommitted={commitOptimisticCatalogAdd}
        />
      )}
      {showOrder && collection && (
        <ReorderCollectionModal
          collectionName={collection.name}
          entries={orderedEntries}
          onClose={() => setShowOrder(false)}
          onApply={reorderEntries}
        />
      )}
      {showSettings && collection && (
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
      <AlertDialog
        open={cardImageUploadError != null}
        title="Photo upload failed"
        description={cardImageUploadError ?? ""}
        onClose={() => setCardImageUploadError(null)}
      />
      <AlertDialog
        open={jsonImportError != null}
        title="Import failed"
        description={jsonImportError ?? ""}
        onClose={() => setJsonImportError(null)}
      />
      <AlertDialog
        open={jsonImportUnresolved != null}
        title="Import finished with warnings"
        description={
          jsonImportUnresolved
            ? `Imported ${jsonImportUnresolved.imported} cards. ${jsonImportUnresolved.unresolved.length} without a matching English image:\n${jsonImportUnresolved.unresolved
                .map((u) => `• ${u.name} (${u.set}) — ${u.reason}`)
                .join("\n")}`
            : ""
        }
        onClose={() => setJsonImportUnresolved(null)}
      />
    </div>
  );
}
