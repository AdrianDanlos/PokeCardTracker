import { CollectionEntriesManager } from "@/components/CollectionEntriesManager";
import { createClient } from "@/lib/supabase/client";
import type { CollectionEntryWithCard, CollectionProgressSummary } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function CollectionSettingsModal({
  collection,
  entries,
  onClose,
  onUpdated,
  onEntriesChanged,
}: {
  collection: CollectionProgressSummary;
  entries: CollectionEntryWithCard[];
  onClose: () => void;
  onUpdated: (c: CollectionProgressSummary) => void;
  onEntriesChanged: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [goal, setGoal] = useState(collection.goal_count?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (collection.collection_id.startsWith("demo-")) {
      onClose();
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("collections")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        goal_count: goal ? Number(goal) : null,
      })
      .eq("id", collection.collection_id)
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      onUpdated({
        ...collection,
        name: data.name,
        description: data.description,
        goal_count: data.goal_count,
      });
      onClose();
    }
  }

  async function uploadCover(file: File) {
    if (collection.collection_id.startsWith("demo-")) return;
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const path = `${userData.user.id}/${collection.collection_id}-${file.name}`;
    const buf = await file.arrayBuffer();
    await supabase.storage.from("collection-covers").upload(path, buf, { upsert: true });
    const { data } = await supabase
      .from("collections")
      .update({ cover_image_path: path })
      .eq("id", collection.collection_id)
      .select("*")
      .single();
    if (data) {
      onUpdated({ ...collection, cover_image_path: data.cover_image_path });
    }
  }

  async function deleteCollection() {
    if (!confirm(`Delete “${collection.name}”? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("collections").delete().eq("id", collection.collection_id);
    navigate("/");
  }

  async function importCsv(file: File) {
    setImporting(true);
    const form = new FormData();
    form.set("collectionId", collection.collection_id);
    form.set("file", file);
    await fetch("/api/collections/import", { method: "POST", body: form });
    setImporting(false);
    onEntriesChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={save}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
      >
        <h2 className="text-xl font-semibold">Collection settings</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="input" type="number" placeholder="Goal count" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <label className="block text-sm">
          <span className="text-muted">Cover image</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1 text-sm text-muted"
            disabled={collection.collection_id.startsWith("demo-")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadCover(f);
            }}
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Binder order & remove entries</p>
          <CollectionEntriesManager
            collectionId={collection.collection_id}
            entries={entries}
            onChanged={onEntriesChanged}
          />
        </div>

        <label className="block text-sm">
          <span className="text-muted">Import CSV (append entries)</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-1 text-sm text-muted"
            disabled={importing || collection.collection_id.startsWith("demo-")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importCsv(f);
            }}
          />
        </label>

        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="btn-ghost text-red-400"
            disabled={collection.collection_id.startsWith("demo-")}
            onClick={() => void deleteCollection()}
          >
            Delete collection
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
