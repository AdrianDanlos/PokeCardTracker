import { useEffect, useMemo, useState } from "react";
import { CollectionGrid } from "@/components/CollectionGrid";
import { NewCollectionModal } from "@/components/NewCollectionModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteCollectionById,
  reorderCollections,
} from "@/lib/api/collections";
import type { CollectionProgressSummary } from "@/lib/types";

export function DashboardClient({
  initialCollections,
  collectionsPending = false,
  loadError = null,
  onCollectionCreated,
  onCollectionDeleted,
  onCollectionsReordered,
}: {
  initialCollections: CollectionProgressSummary[];
  collectionsPending?: boolean;
  loadError?: string | null;
  onCollectionCreated: (col: CollectionProgressSummary) => void;
  onCollectionDeleted: (collectionId: string) => void;
  onCollectionsReordered?: (collections: CollectionProgressSummary[]) => void;
}) {
  const [collections, setCollections] = useState(initialCollections);

  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectionProgressSummary | null>(null);

  async function confirmDeleteCollection() {
    const collection = deleteTarget;
    if (!collection || collection.collection_id.startsWith("demo-")) return;
    setDeletingId(collection.collection_id);
    try {
      await deleteCollectionById(collection.collection_id);
      setCollections((prev) => prev.filter((c) => c.collection_id !== collection.collection_id));
      onCollectionDeleted(collection.collection_id);
      setDeleteTarget(null);
    } catch {
      /* keep list unchanged */
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [collections, search]);

  const canReorderCollections = !search.trim() && collections.length > 1;

  function reorderCollectionsByIds(orderedIds: string[]) {
    const prev = collections;
    const byId = new Map(collections.map((c) => [c.collection_id, c]));
    const reordered = orderedIds.map((id, sort_order) => ({
      ...byId.get(id)!,
      sort_order,
    }));
    setCollections(reordered);
    onCollectionsReordered?.(reordered);

    const updates = reordered
      .map((c, sort_order) => ({
        id: c.collection_id,
        sort_order,
        prev: prev.find((p) => p.collection_id === c.collection_id)?.sort_order,
      }))
      .filter((u) => u.prev !== u.sort_order && !u.id.startsWith("demo-"))
      .map(({ id, sort_order }) => ({ id, sort_order }));

    void reorderCollections(updates).catch(() => {
      setCollections(prev);
      onCollectionsReordered?.(prev);
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My collections</h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            className="input sm:w-56"
            placeholder="Search collections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn-primary whitespace-nowrap" onClick={() => setShowNew(true)}>
            New collection
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="py-10 text-center text-red-400">{loadError}</p>
      ) : (
        <>
          <CollectionGrid
            collections={filtered}
            sortable={canReorderCollections}
            onReorder={canReorderCollections ? reorderCollectionsByIds : undefined}
            onDelete={setDeleteTarget}
            deletingId={deletingId}
          />

          {!collectionsPending && filtered.length === 0 && (
            <p className="text-center text-muted">
              No collections yet. Create one to get started.
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete collection?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and all cards in this list will be removed. This can’t be undone.`
            : ""
        }
        loading={deleteTarget != null && deletingId === deleteTarget.collection_id}
        onCancel={() => {
          if (!deletingId) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteCollection()}
      />

      {showNew && (
        <NewCollectionModal
          onClose={() => setShowNew(false)}
          onCreated={(col) => {
            onCollectionCreated(col);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}
