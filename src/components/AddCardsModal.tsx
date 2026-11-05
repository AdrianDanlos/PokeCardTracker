import { useEffect, useState } from "react";
import {
  addCardToCollection,
  createManualCard,
  suggestCatalogCards,
} from "@/lib/api/cards";
import type { JsonSetImportGroup } from "@/lib/json-set-import";
import { buildJsonSetImportAiPrompt } from "@/lib/json-set-import-ai-prompt";
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
  onJsonImportStart,
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
  onJsonImportStart?: (groups: JsonSetImportGroup[]) => void;
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
  const [manualProgress, setManualProgress] = useState<string | null>(null);
  const [jsonJapaneseSetName, setJsonJapaneseSetName] = useState("");
  const [jsonPromptCopied, setJsonPromptCopied] = useState(false);

  const jsonJapaneseSetNameTrimmed = jsonJapaneseSetName.trim();
  const canCopyJsonPrompt = jsonJapaneseSetNameTrimmed.length > 0 && !loading;

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

  function importJsonSet() {
    setError(null);
    try {
      const groups = parseJsonSetImport(jsonText);
      onClose();
      onJsonImportStart?.(groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
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
              <div className="space-y-3 rounded-lg border border-border bg-black/20 p-3">
                <ol className="list-decimal space-y-3 pl-5 text-sm text-muted">
                  <li className="space-y-2">
                    <span>Japanese set</span>
                    <input
                      className="input mt-1 w-full text-foreground"
                      placeholder="e.g. Leader's Stadium"
                      value={jsonJapaneseSetName}
                      onChange={(e) => {
                        setJsonJapaneseSetName(e.target.value);
                        setJsonPromptCopied(false);
                      }}
                      disabled={loading}
                    />
                  </li>
                  <li>Copy prompt</li>
                  <li>Paste to AI to get results (DeepSeek recommended)</li>
                  <li>Ask AI to reorder the cards to match the binder order we want</li>
                  <li>Paste the JSON below</li>
                </ol>
                <button
                  type="button"
                  className="btn-ghost w-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canCopyJsonPrompt}
                  aria-disabled={!canCopyJsonPrompt}
                  onClick={() => {
                    if (!canCopyJsonPrompt) return;
                    const promptText = buildJsonSetImportAiPrompt(jsonJapaneseSetNameTrimmed);
                    void navigator.clipboard.writeText(promptText).then(() => {
                      setJsonPromptCopied(true);
                      window.setTimeout(() => setJsonPromptCopied(false), 2000);
                    });
                  }}
                >
                  {jsonPromptCopied ? "Copied" : "Copy prompt"}
                </button>
              </div>
              <textarea
                className="input min-h-[200px] font-mono text-xs"
                placeholder={`[\n  {\n    "set": "Leader's Stadium",\n    "enSets": ["gym1"],\n    "cards": [\n      { "name": "Misty's Psyduck", "id": "gym1-15" }\n    ]\n  },\n  {\n    "set": "Leader's Stadium",\n    "enSets": ["gym2"],\n    "cards": [\n      { "name": "Erika's Vileplume", "id": "gym2-42" }\n    ]\n  },\n  {\n    "set": "Leader's Stadium",\n    "enSets": [],\n    "cards": [\n      { "name": "Japan-only card", "id": null }\n    ]\n  }\n]`}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => void importJsonSet()}
                disabled={loading || !jsonText.trim()}
              >
                Import JSON into collection
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
