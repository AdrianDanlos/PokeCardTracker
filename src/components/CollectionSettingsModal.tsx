import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CoverImageField } from "@/components/ui/CoverImageField";
import { clampCollectionDescription, MAX_COLLECTION_DESCRIPTION_LENGTH } from "@/lib/collection-limits";
import { deleteCollectionById } from "@/lib/api/collections";
import { createClient } from "@/lib/supabase/client";
import type { CollectionProgressSummary } from "@/lib/types";
import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function CollectionSettingsModal({
  collection,
  onClose,
  onUpdated,
  onSaved,
  onSaveFailed,
  onDeleted,
}: {
  collection: CollectionProgressSummary;
  onClose: () => void;
  onUpdated: (c: CollectionProgressSummary) => void;
  onSaved?: () => void;
  onSaveFailed?: (previous: CollectionProgressSummary, message: string) => void;
  onDeleted?: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function saveAndClose(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    if (collection.collection_id.startsWith("demo-")) {
      onClose();
      return;
    }
    if (coverUploading) return;

    const trimmedName = name.trim();
    const trimmedDescription = clampCollectionDescription(description.trim()) || null;
    const unchanged =
      trimmedName === collection.name &&
      trimmedDescription === (collection.description ?? null);

    if (unchanged) {
      onClose();
      return;
    }

    const optimistic: CollectionProgressSummary = {
      ...collection,
      name: trimmedName,
      description: trimmedDescription,
    };
    const previous = collection;
    onUpdated(optimistic);
    onClose();

    const supabase = createClient();
    void supabase
      .from("collections")
      .update({
        name: trimmedName,
        description: trimmedDescription,
      })
      .eq("id", collection.collection_id)
      .select("*")
      .single()
      .then(({ data, error }) => {
        if (error) {
          onSaveFailed?.(previous, error.message);
          return;
        }
        if (data) {
          onUpdated({
            ...optimistic,
            name: data.name,
            description: data.description,
          });
        }
        onSaved?.();
      });
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
      onSaved?.();
    }
  }

  async function deleteCollection() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteCollectionById(collection.collection_id);
      setShowDeleteConfirm(false);
      onDeleted?.();
      navigate("/");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete collection");
    } finally {
      setDeleting(false);
    }
  }

  function requestClose() {
    saveAndClose();
  }

  const { onBackdropMouseDown, onBackdropClick, onPanelMouseDown } =
    useDismissableBackdrop(requestClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <form
        onSubmit={(e) => saveAndClose(e)}
        onMouseDown={onPanelMouseDown}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Collection settings</h2>
          <button
            type="button"
            className="btn-ghost py-1 text-lg leading-none"
            aria-label="Save and close"
            disabled={coverUploading}
            onClick={() => saveAndClose()}
          >
            ×
          </button>
        </div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea
          className="input min-h-[80px]"
          placeholder={`Description (max ${MAX_COLLECTION_DESCRIPTION_LENGTH} characters)`}
          value={description}
          maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
          onChange={(e) => setDescription(clampCollectionDescription(e.target.value))}
        />
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

        {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}

        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="btn-ghost text-red-400"
            disabled={collection.collection_id.startsWith("demo-") || deleting || showDeleteConfirm}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete collection
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={coverUploading}>
              Save
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete collection?"
        description={`“${name.trim() || collection.name}” and all cards in this list will be removed. This can’t be undone.`}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false);
        }}
        onConfirm={() => void deleteCollection()}
      />
    </div>
  );
}
