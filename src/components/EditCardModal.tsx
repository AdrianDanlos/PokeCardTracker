import { ManualCardFormFields } from "@/components/ManualCardFormFields";
import { updateCardDisplay, uploadCardDisplayImage } from "@/lib/api/cards";
import { cardImageSrc } from "@/lib/images";
import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";
import type { CollectionEntryWithCard } from "@/lib/types";
import { useMemo, useRef, useState } from "react";

export function EditCardModal({
  entry,
  collectionSetNames = [],
  onClose,
  onSaved,
  onImageUploadFailed,
}: {
  entry: CollectionEntryWithCard;
  collectionSetNames?: string[];
  onClose: () => void;
  onSaved: (updated: CollectionEntryWithCard["card"]) => void;
  onImageUploadFailed?: (message: string) => void;
}) {
  const [cardName, setCardName] = useState(entry.card.name);
  const [setLabel, setSetLabel] = useState(entry.card.set?.name?.trim() ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageBeforeEditRef = useRef({
    image_path: entry.card.image_path,
    image_url: entry.card.image_url,
  });

  const initialPreviewUrl = useMemo(
    () => cardImageSrc(entry.card.image_path, entry.card.image_url),
    [entry.card.image_path, entry.card.image_url],
  );

  const imagePreviewUrl = initialPreviewUrl ?? null;

  async function save(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    setError(null);
    setSaving(true);
    const pendingFile = imageFile;
    try {
      const card = await updateCardDisplay({
        cardId: entry.card_id,
        language: entry.card.language,
        name: cardName,
        setName: setLabel,
        clearImage: false,
      });

      const saved: CollectionEntryWithCard["card"] = {
        id: card.id,
        source_id: card.source_id,
        external_id: card.external_id,
        set_id: card.set_id,
        name: card.name,
        language: card.language,
        image_path: card.image_path,
        image_url: card.image_url,
        attrs: card.attrs ?? {},
        set: card.set,
      };

      let optimisticBlobUrl: string | null = null;
      if (pendingFile) {
        optimisticBlobUrl = URL.createObjectURL(pendingFile);
        saved.image_path = null;
        saved.image_url = optimisticBlobUrl;
      }

      onSaved(saved);
      onClose();

      if (pendingFile) {
        void uploadCardDisplayImage(entry.card_id, pendingFile)
          .then((imagePath) => {
            if (optimisticBlobUrl) URL.revokeObjectURL(optimisticBlobUrl);
            onSaved({
              ...saved,
              image_path: imagePath,
              image_url: null,
            });
          })
          .catch((err) => {
            if (optimisticBlobUrl) URL.revokeObjectURL(optimisticBlobUrl);
            onSaved({
              ...saved,
              image_path: imageBeforeEditRef.current.image_path,
              image_url: imageBeforeEditRef.current.image_url,
            });
            onImageUploadFailed?.(
              err instanceof Error ? err.message : "Photo upload failed",
            );
          });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const { onBackdropMouseDown, onBackdropClick, onPanelMouseDown } = useDismissableBackdrop(onClose);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <form
        onSubmit={(e) => void save(e)}
        onMouseDown={onPanelMouseDown}
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-surface-elevated p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Edit card</h2>
          <button type="button" className="btn-ghost py-1" onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
        <div className="space-y-3">
          <ManualCardFormFields
            name={cardName}
            setName={setLabel}
            onNameChange={setCardName}
            onSetNameChange={setSetLabel}
            collectionSetNames={collectionSetNames}
            imageFile={imageFile}
            onImageFileChange={setImageFile}
            imagePreviewUrl={imagePreviewUrl}
            disabled={saving}
            nameAutoFocus
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
