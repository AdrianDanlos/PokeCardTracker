import { useEffect, useMemo, useState } from "react";
import { CollectionCard } from "@/components/CollectionCard";
import { NewCollectionModal } from "@/components/NewCollectionModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteCollectionById } from "@/lib/api/collections";
import type { CollectionProgressSummary } from "@/lib/types";

export function DashboardClient({
  initialCollections,
  onCollectionCreated,
  onCollectionDeleted,
}: {
  initialCollections: CollectionProgressSummary[];
  onCollectionCreated: (col: CollectionProgressSummary) => void;
  onCollectionDeleted: (collectionId: string) => void;
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My collections</h1>
          <p className="mt-2 max-w-xl text-muted">
            Each collection is a list you define. Progress counts only the entries inside it.
          </p>
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

      <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {filtered.map((c, i) => (
          <CollectionCard
            key={c.collection_id}
            collection={c}
            index={i}
            onDelete={() => setDeleteTarget(c)}
            deleting={deletingId === c.collection_id}
          />
        ))}
      </div>

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

      {filtered.length === 0 && (
        <p className="text-center text-muted">No collections yet. Create one to get started.</p>
      )}

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
