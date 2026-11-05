import { useEffect, useState } from "react";
import {
  addCardToCollection,
  bulkAddCardsToCollection,
  createManualCard,
  importSetToCollection,
  searchCatalogCards,
  suggestCatalogCards,
  suggestCatalogSets,
} from "@/lib/api/cards";
import { CoverImageField } from "@/components/ui/CoverImageField";
import {
  CatalogAutocomplete,
  type CatalogAutocompleteOption,
} from "@/components/ui/CatalogAutocomplete";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/types";

type SearchRow = { externalId: string; name: string; setName: string | null };

export function AddCardsModal({
  collectionId,
  collectionName,
  onClose,
  onAdded,
}: {
  collectionId: string;
  collectionName: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<"search" | "set" | "manual">("search");
  const [tcgLanguage, setTcgLanguage] = useState<"jp" | "en">("jp");
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState({
    name: "",
    language: DEFAULT_CARD_LANGUAGE,
  });
  const [manualImage, setManualImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardSuggestLoading, setCardSuggestLoading] = useState(false);
  const [setSuggestLoading, setSetSuggestLoading] = useState(false);
  const [cardSuggestions, setCardSuggestions] = useState<CatalogAutocompleteOption[]>([]);
  const [setSuggestions, setSetSuggestions] = useState<CatalogAutocompleteOption[]>([]);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 280);
  const debouncedSetId = useDebouncedValue(setId, 280);

  useEffect(() => {
    if (tab !== "search") {
      setCardSuggestions([]);
      return;
    }
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setCardSuggestions([]);
      return;
    }
    let cancelled = false;
    setCardSuggestLoading(true);
    suggestCatalogCards({ q, language: tcgLanguage })
      .then((rows) => {
        if (cancelled) return;
        setCardSuggestions(
          rows.map((r) => ({
            id: r.externalId,
            label: r.name,
            detail: r.externalId,
          })),
        );
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
  }, [debouncedQuery, tcgLanguage, tab]);

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
    suggestCatalogSets({ q, language: tcgLanguage })
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
  }, [debouncedSetId, tcgLanguage, tab]);

  async function runSearch(searchQuery = query) {
    setLoading(true);
    setError(null);
    try {
      const rows = await searchCatalogCards({
        q: searchQuery,
        source: "tcgdex",
        language: tcgLanguage,
      });
      setResults(rows);
      setSelected(new Set(rows.map((r) => r.externalId)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
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
          language: tcgLanguage,
        },
        (done, total) => {
          setImportProgress(`Adding cards… ${done}/${total}`);
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

  async function addResult(externalId: string) {
    setLoading(true);
    setError(null);
    try {
      await addCardToCollection({
        source: "tcgdex",
        externalId,
        collectionId,
        language: tcgLanguage,
      });
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add card");
    } finally {
      setLoading(false);
    }
  }

  async function addSelectedBulk() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await bulkAddCardsToCollection({
        source: "tcgdex",
        externalIds: ids,
        collectionId,
        language: tcgLanguage,
      });
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk add failed");
    } finally {
      setLoading(false);
    }
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createManualCard({
        collectionId,
        name: manual.name,
        setName: collectionName,
        language: manual.language,
        imageFile: manualImage,
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create card");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Add cards</h2>
          <button type="button" className="btn-ghost py-1" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["search", "set", "manual"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tab === t ? "chip-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "search" ? "API search" : t === "set" ? "Import set" : "Manual"}
            </button>
          ))}
        </div>
        <div className="min-h-0">
          {tab !== "manual" && (
            <label className="mb-3 block text-sm">
              <span className="text-muted">TCGdex language</span>
              <select
                className="input mt-1"
                value={tcgLanguage}
                onChange={(e) => setTcgLanguage(e.target.value as "jp" | "en")}
              >
                <option value="jp">Japanese (jp)</option>
                <option value="en">English (en)</option>
              </select>
            </label>
          )}

          {tab === "search" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <CatalogAutocomplete
                  value={query}
                  onChange={setQuery}
                  options={cardSuggestions}
                  loading={cardSuggestLoading}
                  minChars={2}
                  placeholder="Search card name"
                  disabled={loading}
                  onSelect={(opt) => {
                    setQuery(opt.label);
                    void runSearch(opt.label);
                  }}
                />
                <button
                  type="button"
                  className="btn-primary shrink-0"
                  onClick={() => void runSearch()}
                  disabled={loading}
                >
                  Search
                </button>
              </div>
              {results.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost text-xs" onClick={() => setSelected(new Set(results.map((r) => r.externalId)))}>
                    Select all
                  </button>
                  <button type="button" className="btn-primary text-xs" onClick={addSelectedBulk} disabled={loading || selected.size === 0}>
                    Add {selected.size} selected
                  </button>
                </div>
              )}
              <ul className="divide-y divide-border rounded-lg border border-border">
                {results.map((r) => (
                  <li key={r.externalId} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.externalId)}
                        onChange={() => toggleSelected(r.externalId)}
                      />
                      <span className="truncate">
                        {r.name}
                        {r.setName && <span className="text-muted"> · {r.setName}</span>}
                      </span>
                    </label>
                    <button type="button" className="btn-ghost py-1 text-xs" onClick={() => addResult(r.externalId)}>
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "set" && (
            <div className="space-y-3">
              <CatalogAutocomplete
                value={setId}
                onChange={setSetId}
                options={setSuggestions}
                loading={setSuggestLoading}
                minChars={1}
                placeholder="Set name or ID (e.g. gym, gym2)"
                disabled={loading}
                onSelect={(opt) => setSetId(opt.id)}
              />
              <button
                type="button"
                className="btn-primary relative z-20 w-full"
                onClick={() => void importSet()}
                disabled={loading || !setId.trim()}
              >
                {loading && importProgress ? importProgress : "Import all cards into collection"}
              </button>
            </div>
          )}

          {tab === "manual" && (
            <form className="space-y-3" onSubmit={createManual}>
              <p className="text-sm text-muted">
                Set: <span className="text-foreground">{collectionName}</span>
              </p>
              <input className="input" placeholder="Card name" required value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
              <input className="input" placeholder="Language" value={manual.language} onChange={(e) => setManual({ ...manual, language: e.target.value })} />
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
                Create & add to collection
              </button>
            </form>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
