import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";

export function AlertDialog({
  open,
  title,
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  const { onBackdropMouseDown, onBackdropClick, onPanelMouseDown } =
    useDismissableBackdrop(onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-desc"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated p-6 shadow-xl"
        onMouseDown={onPanelMouseDown}
      >
        <h3 id="alert-dialog-title" className="shrink-0 text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p
          id="alert-dialog-desc"
          className="mt-2 max-h-[calc(100dvh-11rem)] min-h-0 overflow-y-auto overscroll-contain whitespace-pre-line text-sm leading-relaxed text-muted"
        >
          {description}
        </p>
        <div className="mt-6 flex shrink-0 justify-end">
          <button type="button" className="btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
