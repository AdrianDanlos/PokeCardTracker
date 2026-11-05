import { useEffect, useState } from "react";
import {
  addCardToCollection,
  createManualCard,
  importJsonSetToCollection,
  suggestCatalogCards,
  type JsonSetImportUnresolved,
} from "@/lib/api/cards";
import { parseJsonSetImport } from "@/lib/json-set-import";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { CoverImageField } from "@/components/ui/CoverImageField";
import {
  CatalogAutocomplete,
  type CatalogAutocompleteOption,
} from "@/components/ui/CatalogAutocomplete";
import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/types";

export type CatalogSearchRow = {
  externalId: string;
  name: string;
  setName: string | null;
  imageUrl: string | null;
};

/** TCGdex catalog for API search / set import is English-only in this app. */
const TCGDEX_CATALOG_LANGUAGE = "en" as const;

export function AddCardsModal({
  collectionId,
  collectionName,
  onClose,
  onAdded,
  onOptimisticCardAdd,
  onOptimisticCardAddRevert,
  onCardAddCommitted,
}: {
  collectionId: string;
  collectionName: string;
  onClose: () => void;
  onAdded: () => void;
  onOptimisticCardAdd?: (row: CatalogSearchRow) => void;
  onOptimisticCardAddRevert?: (externalId: string) => void;
  onCardAddCommitted?: (
    externalId: string,
    ids: { cardId: string; entryId?: string; imagePath?: string | null },
  ) => void;
}) {
  const [tab, setTab] = useState<"search" | "json" | "manual">("json");
  const [query, setQuery] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [cardRowsById, setCardRowsById] = useState<Map<string, CatalogSearchRow>>(() => new Map());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualImage, setManualImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addErrorDialog, setAddErrorDialog] = useState<string | null>(null);
  const [cardSuggestLoading, setCardSuggestLoading] = useState(false);
  const [cardSuggestions, setCardSuggestions] = useState<CatalogAutocompleteOption[]>([]);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    unresolved: JsonSetImportUnresolved[];
  } | null>(null);
  const [manualProgress, setManualProgress] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 280);
  const trimmedCardQuery = query.trim();
  const trimmedDebouncedCardQuery = debouncedQuery.trim();
  const cardSearchSettled = trimmedCardQuery === trimmedDebouncedCardQuery;

  useEffect(() => {
    if (tab !== "search") {
      setCardSuggestions([]);
      return;
    }
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setCardSuggestions([]);
      setCardRowsById(new Map());
      return;
    }
    let cancelled = false;
    setCardSuggestLoading(true);
    suggestCatalogCards({ q, language: TCGDEX_CATALOG_LANGUAGE })
      .then((rows) => {
        if (cancelled) return;
        const byId = new Map<string, CatalogSearchRow>();
        const options: CatalogAutocompleteOption[] = rows.map((r) => {
          byId.set(r.externalId, {
            externalId: r.externalId,
            name: r.name,
            setName: r.setName,
            imageUrl: r.imageUrl ?? null,
          });
          return {
            id: r.externalId,
            label: r.setName ? `${r.name} · ${r.setName}` : r.name,
            detail: r.externalId,
            imageUrl: r.imageUrl ?? null,
          };
        });
        setCardRowsById(byId);
        setCardSuggestions(options);
      })
      .catch(() => {
        if (!cancelled) setCardSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setCardSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, tab]);

  function showSuccess(message: string) {
    setSuccessMessage(message);
  }

  async function importJsonSet() {
    setLoading(true);
    setError(null);
    setImportSummary(null);
    setImportProgress("Parsing JSON…");
    try {
      const groups = parseJsonSetImport(jsonText);
      const result = await importJsonSetToCollection(groups, collectionId, (done, total) => {
        setImportProgress(`Importing cards & photos… ${done}/${total}`);
      });
      onAdded();
      if (result.unresolved.length === 0) {
        onClose();
        return;
      }
      setImportSummary(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  }

  async function addResult(row: CatalogSearchRow) {
    if (addedIds.has(row.externalId) || addingIds.has(row.externalId)) return;

    showSuccess(`Added “${row.name}” to your collection`);
    setQuery("");
    setCardSuggestions([]);
    setCardRowsById(new Map());
    setAddingIds((prev) => new Set(prev).add(row.externalId));
    onOptimisticCardAdd?.(row);

    try {
      const { cardId, entryId, imagePath } = await addCardToCollection({
        source: "tcgdex",
        externalId: row.externalId,
        collectionId,
        language: TCGDEX_CATALOG_LANGUAGE,
      });
      setAddedIds((prev) => new Set(prev).add(row.externalId));
      onCardAddCommitted?.(row.externalId, { cardId, entryId, imagePath });
    } catch (e) {
      setSuccessMessage(null);
      onOptimisticCardAddRevert?.(row.externalId);
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.externalId);
        return next;
      });
      setAddErrorDialog(e instanceof Error ? e.message : "Could not add card");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.externalId);
        return next;
      });
    }
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setManualProgress("Creating card…");
    try {
      await createManualCard(
        {
          collectionId,
          name: manualName,
          setName: collectionName,
          language: DEFAULT_CARD_LANGUAGE,
          imageFile: manualImage,
        },
        setManualProgress,
      );
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create card");
    } finally {
      setLoading(false);
      setManualProgress(null);
    }
  }

  function requestClose() {
    if (loading) return;
    onClose();
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
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-cards-title"
        onMouseDown={onPanelMouseDown}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="add-cards-title" className="text-xl font-semibold">
            Add cards
          </h2>
          <button type="button" className="btn-ghost py-1" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["json", "search", "manual"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tab === t ? "chip-active" : ""}`}
              onClick={() => {
                setTab(t);
                setImportSummary(null);
                setError(null);
              }}
            >
              {t === "search" ? "Import card" : t === "json" ? "Import JSON" : "Manual"}
            </button>
          ))}
        </div>
        <div className="min-h-0">
          {tab === "search" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Only english cards available</p>
              <CatalogAutocomplete
                value={query}
                onChange={setQuery}
                options={cardSuggestions}
                loading={cardSuggestLoading}
                minChars={2}
                dropDirection="inline"
                placeholder="Search card name"
                disabled={loading}
                onSelect={(opt) => {
                  const row = cardRowsById.get(opt.id);
                  if (row) void addResult(row);
                }}
              />
              {successMessage && (
                <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
                  {successMessage}
                </p>
              )}
              {!cardSuggestLoading &&
                cardSearchSettled &&
                trimmedCardQuery.length >= 2 &&
                cardSuggestions.length === 0 && (
                  <p className="text-sm text-muted">No cards found.</p>
                )}
            </div>
          )}

          {tab === "json" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Paste a set group or array of groups. Card names and set labels are yours; English
                TCGdex ids in <code className="text-foreground">enSets</code> / optional{" "}
                <code className="text-foreground">id</code> per card supply photos. Order in the file
                is collection order (appended after existing cards).
              </p>
              <textarea
                className="input min-h-[200px] font-mono text-xs"
                placeholder={`{\n  "set": "Leader's Stadium",\n  "enSets": ["gym1"],\n  "cards": [{ "name": "Erika's Vileplume" }]\n}`}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                disabled={loading}
              />
              {importSummary && importSummary.unresolved.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  <p className="font-medium text-amber-200">
                    Imported {importSummary.imported} cards. {importSummary.unresolved.length} without
                    a matching English image:
                  </p>
                  <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-xs text-muted">
                    {importSummary.unresolved.map((u) => (
                      <li key={`${u.set}:${u.name}`}>
                        {u.name} ({u.set}) — {u.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => void importJsonSet()}
                disabled={loading || !jsonText.trim()}
              >
                {loading && importProgress ? importProgress : "Import JSON into collection"}
              </button>
            </div>
          )}

          {tab === "manual" && (
            <form className="space-y-3" onSubmit={createManual}>
              <input
                className="input"
                placeholder="Card name"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <CoverImageField
                label=""
                emptyText="No photo"
                previewAspectClass="aspect-[3/4]"
                previewWrapClassName="mx-auto w-full max-w-[120px]"
                actionsWrapClassName="mx-auto w-full max-w-[120px]"
                emptyTextClassName="text-xs"
                file={manualImage}
                onFileChange={setManualImage}
                disabled={loading}
              />
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading && manualProgress ? manualProgress : "Create & add to collection"}
              </button>
            </form>
          )}

          {error && tab !== "search" && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
      <AlertDialog
        open={addErrorDialog != null}
        title="Could not add card"
        description={addErrorDialog ?? ""}
        onClose={() => setAddErrorDialog(null)}
      />
    </div>
  );
}
