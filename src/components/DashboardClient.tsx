import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CollectionCard } from "@/components/CollectionCard";
import { NewCollectionModal } from "@/components/NewCollectionModal";
import { exportInventoryCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import type { CollectionProgressSummary } from "@/lib/types";

export function DashboardClient({
  initialCollections,
}: {
  initialCollections: CollectionProgressSummary[];
}) {
  const [collections, setCollections] = useState(initialCollections);
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

  async function exportInventory() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: copies } = await supabase.from("owned_copies").select("*").eq("user_id", userData.user.id);
    if (!copies?.length) return;
    const cardIds = [...new Set(copies.map((c) => c.card_id))];
    const { data: cards } = await supabase.from("cards").select("id, name").in("id", cardIds);
    const names = new Map((cards ?? []).map((c) => [c.id, c.name as string]));
    const csv = exportInventoryCsv(copies, names);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
  }

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
          <button type="button" className="btn-ghost whitespace-nowrap" onClick={exportInventory}>
            Export inventory CSV
          </button>
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
            setCollections((prev) => [...prev, col]);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

export function DashboardRequiresAuth() {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center">
      <h1 className="text-2xl font-bold">My collections</h1>
      <p className="mt-3 text-muted">Sign in with a magic link to manage your collections.</p>
      <Link to="/login" className="btn-primary mt-6 inline-block">
        Log in
      </Link>
    </div>
  );
}
