import { useEffect, useState } from "react";
import {
  addCardToCollection,
  createManualCard,
  importSetToCollection,
  suggestCatalogCards,
  suggestCatalogSets,
} from "@/lib/api/cards";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { CoverImageField } from "@/components/ui/CoverImageField";
import {
  CatalogAutocomplete,
  type CatalogAutocompleteOption,
} from "@/components/ui/CatalogAutocomplete";
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
  const [tab, setTab] = useState<"search" | "set" | "manual">("set");
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
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
  const [setSuggestLoading, setSetSuggestLoading] = useState(false);
  const [cardSuggestions, setCardSuggestions] = useState<CatalogAutocompleteOption[]>([]);
  const [setSuggestions, setSetSuggestions] = useState<CatalogAutocompleteOption[]>([]);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [manualProgress, setManualProgress] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 280);
  const debouncedSetId = useDebouncedValue(setId, 280);
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

  useEffect(() => {
    if (tab !== "set") {
      setSetSuggestions([]);
      return;
    }
    const q = debouncedSetId.trim();
    if (!q) {
      setSetSuggestions([]);
      return;
    }
    let cancelled = false;
    setSetSuggestLoading(true);
    suggestCatalogSets({ q, language: TCGDEX_CATALOG_LANGUAGE })
      .then((rows) => {
        if (cancelled) return;
        setSetSuggestions(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            detail: r.id,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setSetSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSetSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSetId, tab]);

  function showSuccess(message: string) {
    setSuccessMessage(message);
  }

  async function importSet() {
    setLoading(true);
    setError(null);
    setImportProgress("Loading set from TCGdex…");
    try {
      await importSetToCollection(
        {
          source: "tcgdex",
          setExternalId: setId.trim(),
          collectionId,
          language: TCGDEX_CATALOG_LANGUAGE,
        },
        (done, total) => {
          setImportProgress(`Importing cards & photos… ${done}/${total}`);
        },
      );
      onAdded();
      onClose();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={requestClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-cards-title"
        onClick={(e) => e.stopPropagation()}
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
          {(["set", "search", "manual"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tab === t ? "chip-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "search" ? "Import card" : t === "set" ? "Import set" : "Manual"}
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

          {tab === "set" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Only english sets available</p>
              <CatalogAutocomplete
                value={setId}
                onChange={setSetId}
                options={setSuggestions}
                loading={setSuggestLoading}
                minChars={1}
                dropDirection="inline"
                placeholder="Set name or ID (e.g. gym, gym2)"
                disabled={loading}
                onSelect={(opt) => setSetId(opt.id)}
              />
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => void importSet()}
                disabled={loading || !setId.trim()}
              >
                {loading && importProgress ? importProgress : "Import all cards into collection"}
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
