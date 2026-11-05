import { useEffect, useMemo, useState } from "react";
import { CollectionCard } from "@/components/CollectionCard";
import { NewCollectionModal } from "@/components/NewCollectionModal";
import type { CollectionProgressSummary } from "@/lib/types";

export function DashboardClient({
  initialCollections,
  onCollectionCreated,
}: {
  initialCollections: CollectionProgressSummary[];
  onCollectionCreated: (col: CollectionProgressSummary) => void;
}) {
  const [collections, setCollections] = useState(initialCollections);

  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

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

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {filtered.map((c, i) => (
          <CollectionCard key={c.collection_id} collection={c} index={i} />
        ))}
      </div>

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
