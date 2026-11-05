import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  addCardToCollection,
  createManualCard,
  suggestCatalogCards,
} from "@/lib/api/cards";
import type { JsonSetImportGroup } from "@/lib/json-set-import";
import { buildJsonSetImportAiPrompt } from "@/lib/json-set-import-ai-prompt";
import { parseJsonSetImport } from "@/lib/json-set-import";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { ManualCardFormFields } from "@/components/ManualCardFormFields";
import {
  CatalogAutocomplete,
  type CatalogAutocompleteOption,
} from "@/components/ui/CatalogAutocomplete";
import { useDismissableBackdrop } from "@/lib/useDismissableBackdrop";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  fetchJapaneseSetCatalog,
  suggestJapaneseSets,
} from "@/lib/api/tcgplayer-set";
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
  onClose,
  onAdded,
  onOptimisticCardAdd,
  onOptimisticCardAddRevert,
  onCardAddCommitted,
  onJsonImportStart,
  onTcgplayerImportStart,
}: {
  collectionId: string;
  onClose: () => void;
  onAdded: () => void;
  onOptimisticCardAdd?: (row: CatalogSearchRow) => void;
  onOptimisticCardAddRevert?: (externalId: string) => void;
  onCardAddCommitted?: (
    externalId: string,
    ids: { cardId: string; entryId?: string; imagePath?: string | null },
  ) => void;
  onJsonImportStart?: (groups: JsonSetImportGroup[]) => void;
  onTcgplayerImportStart?: (setName: string) => void;
}) {
  const [tab, setTab] = useState<"search" | "json" | "manual">("json");
  const [jsonMode, setJsonMode] = useState<"choose" | "ai">("choose");
  const [query, setQuery] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [cardRowsById, setCardRowsById] = useState<
    Map<string, CatalogSearchRow>
  >(() => new Map());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualSetName, setManualSetName] = useState("");
  const [manualImage, setManualImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addErrorDialog, setAddErrorDialog] = useState<string | null>(null);
  const [cardSuggestLoading, setCardSuggestLoading] = useState(false);
  const [cardSuggestions, setCardSuggestions] = useState<
    CatalogAutocompleteOption[]
  >([]);
  const [manualProgress, setManualProgress] = useState<string | null>(null);
  const [jsonJapaneseSetName, setJsonJapaneseSetName] = useState("");
  const [jsonPromptCopied, setJsonPromptCopied] = useState(false);

  const jsonJapaneseSetNameTrimmed = jsonJapaneseSetName.trim();
  const canCopyJsonPrompt = jsonJapaneseSetNameTrimmed.length > 0 && !loading;

  const { data: jpSetCatalog = [], isLoading: jpSetCatalogLoading } = useQuery({
    queryKey: ["tcgos-jp-sets-catalog"],
    queryFn: fetchJapaneseSetCatalog,
    staleTime: 86_400_000,
    enabled: tab === "json",
  });

  const jpSetSuggestions = useMemo((): CatalogAutocompleteOption[] => {
    return suggestJapaneseSets(jpSetCatalog, jsonJapaneseSetName, 30).map(
      (entry) => ({
        id: entry.slug,
        label: entry.name,
      }),
    );
  }, [jpSetCatalog, jsonJapaneseSetName]);

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
          setName: manualSetName,
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
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-xl border border-border bg-surface-elevated p-6"
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
                if (t === "json") setJsonMode("choose");
              }}
            >
              {t === "search"
                ? "Import card"
                : t === "json"
                  ? "Import Set"
                  : "Manual"}
            </button>
          ))}
        </div>
        <div className="min-h-0 overflow-y-auto">
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
              <div className="mb-5 space-y-1.5 text-sm">
                <span className="block text-muted">Japanese set</span>
                <CatalogAutocomplete
                  value={jsonJapaneseSetName}
                  onChange={(value) => {
                    setJsonJapaneseSetName(value);
                    setJsonPromptCopied(false);
                  }}
                  options={jpSetSuggestions}
                  loading={jpSetCatalogLoading}
                  minChars={0}
                  dropDirection="inline"
                  placeholder="e.g. Leader's Stadium"
                  disabled={loading}
                  onSelect={(option) => {
                    setJsonJapaneseSetName(option.label);
                    setJsonPromptCopied(false);
                  }}
                />
                {!jpSetCatalogLoading &&
                jsonJapaneseSetNameTrimmed.length > 0 &&
                jpSetSuggestions.length === 0 ? (
                  <p className="text-xs text-muted">
                    No matching Japanese sets in the catalog. You can still use
                    this name.
                  </p>
                ) : null}
                <p className="text-xs leading-snug text-muted">
                  Find all sets here:{" "}
                  <a
                    href="https://www.thetcgos.com/g/pokemon/japanese"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-accent underline-offset-2 hover:underline"
                  >
                    The TCG OS
                  </a>
                  {" · "}
                  <a
                    href="https://www.tcgcollector.com/sets/jp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-accent underline-offset-2 hover:underline"
                  >
                    TCG Collector
                  </a>
                </p>
              </div>
              {jsonMode === "choose" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canCopyJsonPrompt}
                    onClick={() => {
                      if (!canCopyJsonPrompt) return;
                      onClose();
                      onTcgplayerImportStart?.(jsonJapaneseSetNameTrimmed);
                    }}
                  >
                    Fetch with TCGPlayer
                  </button>
                  <button
                    type="button"
                    className="btn-ghost flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canCopyJsonPrompt}
                    onClick={() => setJsonMode("ai")}
                  >
                    Fetch with AI
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 rounded-lg border border-border bg-black/20 p-3">
                    <ol className="list-decimal space-y-3 pl-5 text-sm text-muted">
                      <li>Copy prompt</li>
                      <li>Paste to AI to get results</li>
                      <li>
                        Ask AI to reorder the cards to match the binder order we
                        want
                      </li>
                      <li>Paste the JSON below</li>
                    </ol>
                    <button
                      type="button"
                      className="btn-ghost w-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!canCopyJsonPrompt}
                      aria-disabled={!canCopyJsonPrompt}
                      onClick={() => {
                        if (!canCopyJsonPrompt) return;
                        const promptText = buildJsonSetImportAiPrompt(
                          jsonJapaneseSetNameTrimmed,
                        );
                        void navigator.clipboard
                          .writeText(promptText)
                          .then(() => {
                            setJsonPromptCopied(true);
                            window.setTimeout(
                              () => setJsonPromptCopied(false),
                              2000,
                            );
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
                  <button
                    type="button"
                    className="btn-ghost w-full text-sm"
                    onClick={() => setJsonMode("choose")}
                  >
                    Back
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "manual" && (
            <form className="space-y-3" onSubmit={createManual}>
              <ManualCardFormFields
                name={manualName}
                setName={manualSetName}
                onNameChange={setManualName}
                onSetNameChange={setManualSetName}
                imageFile={manualImage}
                onImageFileChange={setManualImage}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading && manualProgress
                  ? manualProgress
                  : "Create & add to collection"}
              </button>
            </form>
          )}

          {error && tab !== "search" && (
            <p className="text-sm text-red-400">{error}</p>
          )}
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
