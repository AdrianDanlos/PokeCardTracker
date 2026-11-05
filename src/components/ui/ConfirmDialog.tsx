import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { onBackdropMouseDown, onBackdropClick, onPanelMouseDown } = useDismissableBackdrop(() => {
    if (!loading) onCancel();
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={loading ? undefined : onBackdropMouseDown}
      onClick={loading ? undefined : onBackdropClick}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 shadow-xl"
        onMouseDown={onPanelMouseDown}
      >
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="mt-2 text-sm leading-relaxed text-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
