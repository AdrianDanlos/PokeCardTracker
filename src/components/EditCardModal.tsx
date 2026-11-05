import { updateCardDisplay } from "@/lib/api/cards";
import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";
import type { CollectionEntryWithCard } from "@/lib/types";
import { useState } from "react";

export function EditCardModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: CollectionEntryWithCard;
  onClose: () => void;
  onSaved: (updated: CollectionEntryWithCard["card"]) => void;
}) {
  const [name, setName] = useState(entry.card.name);
  const [setLabel, setSetLabel] = useState(entry.card.set?.name?.trim() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    setError(null);
    setSaving(true);
    try {
      const card = await updateCardDisplay({
        cardId: entry.card_id,
        language: entry.card.language,
        name,
        setName: setLabel,
      });
      onSaved({
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
      });
      onClose();
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
        <label className="space-y-1 text-sm">
          <span className="text-muted">Card name</span>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Set</span>
          <input
            className="input w-full"
            value={setLabel}
            onChange={(e) => setSetLabel(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
