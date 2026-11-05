import { CoverImageField } from "@/components/ui/CoverImageField";
import { applyCollectionOrderImport } from "@/lib/api/collection-order";
import { parseCollectionOrderJson } from "@/lib/collection-order-json";
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
  const [coverUploading, setCoverUploading] = useState(false);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [orderJson, setOrderJson] = useState("");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderImporting, setOrderImporting] = useState(false);

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

  async function uploadCover(file: File | null) {
    if (!file || collection.collection_id.startsWith("demo-")) return;
    setCoverUploading(true);
    setPendingCover(file);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setCoverUploading(false);
      setPendingCover(null);
      return;
    }
    const path = `${userData.user.id}/${collection.collection_id}-${file.name}`;
    const buf = await file.arrayBuffer();
    await supabase.storage.from("collection-covers").upload(path, buf, { upsert: true });
    const { data } = await supabase
      .from("collections")
      .update({ cover_image_path: path })
      .eq("id", collection.collection_id)
      .select("*")
      .single();
    setCoverUploading(false);
    setPendingCover(null);
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

  async function importOrderJson() {
    setOrderError(null);
    if (collection.collection_id.startsWith("demo-")) return;
    setOrderImporting(true);
    try {
      const rows = parseCollectionOrderJson(orderJson);
      await applyCollectionOrderImport({
        collectionId: collection.collection_id,
        collectionName: name.trim() || collection.name,
        rows,
        existingEntries: entries,
      });
      setOrderJson("");
      onEntriesChanged();
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setOrderImporting(false);
    }
  }

  function requestClose() {
    if (saving || coverUploading || orderImporting) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={requestClose}
      role="presentation"
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
      >
        <h2 className="text-xl font-semibold">Collection settings</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="input" type="number" placeholder="Goal count" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <CoverImageField
          existingCoverPath={collection.cover_image_path}
          file={pendingCover}
          disabled={coverUploading || collection.collection_id.startsWith("demo-")}
          onFileChange={(f) => {
            if (!f) {
              setPendingCover(null);
              return;
            }
            void uploadCover(f);
          }}
        />
        {coverUploading && <p className="text-xs text-muted">Uploading cover…</p>}

        <div className="space-y-2">
          <p className="text-sm font-medium">Import card order (JSON)</p>
          <p className="text-xs text-muted">
            Object keys are card names and values are slot numbers, e.g.{" "}
            <code className="text-foreground">{`{"Pikachu": 1, "Raichu": 2}`}</code>
            . Or an array of <code className="text-foreground">"Name: 1"</code> strings. Missing names are
            added as manual cards.
          </p>
          <textarea
            className="input min-h-[120px] font-mono text-xs"
            placeholder='{"Card name": 1, "Other card": 2}'
            value={orderJson}
            onChange={(e) => setOrderJson(e.target.value)}
            disabled={collection.collection_id.startsWith("demo-") || orderImporting}
          />
          {orderError && <p className="text-sm text-red-400">{orderError}</p>}
          <button
            type="button"
            className="btn-ghost w-full"
            disabled={!orderJson.trim() || orderImporting || collection.collection_id.startsWith("demo-")}
            onClick={() => void importOrderJson()}
          >
            {orderImporting ? "Importing…" : "Apply JSON import"}
          </button>
        </div>

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
