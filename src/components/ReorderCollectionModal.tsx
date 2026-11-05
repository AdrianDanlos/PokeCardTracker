import {
  buildOrderExport,
  validateOrderJson,
} from "@/lib/collection-order-json";
import type { CollectionEntryWithCard } from "@/lib/types";
import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";
import { useMemo, useState } from "react";

export function ReorderCollectionModal({
  collectionName,
  entries,
  onClose,
  onApply,
}: {
  collectionName: string;
  entries: CollectionEntryWithCard[];
  onClose: () => void;
  onApply: (orderedIds: string[]) => void;
}) {
  const exportJson = useMemo(() => buildOrderExport(entries), [entries]);
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[] | null>(
    null,
  );

  const { onBackdropMouseDown, onBackdropClick, onPanelMouseDown } =
    useDismissableBackdrop(onClose);

  function copyExport() {
    void navigator.clipboard.writeText(exportJson).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadExport() {
    const safeName =
      collectionName.trim().replace(/[^\w\-]+/g, "_").slice(0, 80) ||
      "collection";
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}-order.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyOrder() {
    setValidationErrors(null);
    const result = validateOrderJson(pasteText, entries);
    if (result.ok === false) {
      setValidationErrors(result.errors);
      return;
    }
    onApply(result.orderedIds);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div
        onMouseDown={onPanelMouseDown}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Reorder with AI</h2>
          <button
            type="button"
            className="btn-ghost py-1 text-lg leading-none"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <ol className="list-decimal space-y-4 pl-5 text-sm">
          <li className="space-y-2">
            <span className="font-medium text-foreground">Export collection</span>
            <p className="text-muted">
              Copy or download the JSON, then send it to your AI assistant.
            </p>
            <pre className="input max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs">
              {exportJson}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={copyExport}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="btn-ghost text-sm" onClick={downloadExport}>
                Download .json
              </button>
            </div>
          </li>

          <li className="space-y-1">
            <span className="font-medium text-foreground">Reorder JSON with AI</span>
            <p className="text-muted">
              Ask the AI to sort the array to match your binder order. Keep every
              object unchanged — same <code className="text-xs">id</code>,{" "}
              <code className="text-xs">name</code>, and <code className="text-xs">set</code> —
              only change the order of items in the array.
            </p>
          </li>

          <li className="space-y-2">
            <span className="font-medium text-foreground">Paste the new JSON</span>
            <textarea
              className="input min-h-[160px] w-full font-mono text-xs"
              placeholder={exportJson.slice(0, 120) + "…"}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setValidationErrors(null);
              }}
            />
            {validationErrors && validationErrors.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-400">
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!pasteText.trim()}
              onClick={applyOrder}
            >
              Apply order
            </button>
          </li>
        </ol>

        <div className="flex justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
