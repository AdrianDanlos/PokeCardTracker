"use client";

import { useState } from "react";
import type { CardCategory, CardSourceId } from "@/lib/types";

type SearchRow = { externalId: string; name: string; setName: string | null };

export function AddCardsModal({
  collectionId,
  onClose,
  onAdded,
}: {
  collectionId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<"search" | "set" | "manual">("search");
  const [source, setSource] = useState<CardSourceId>("pokemontcg");
  const [tcgLanguage, setTcgLanguage] = useState<"ja" | "en">("ja");
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState({
    name: "",
    number: "",
    setName: "",
    rarity: "",
    language: "en",
    category: "custom" as CardCategory,
    edition: "",
    variant: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);
    const langParam = source === "tcgdex" ? `&language=${tcgLanguage}` : "";
    const res = await fetch(
      `/api/cards/search?q=${encodeURIComponent(query)}&source=${source}${langParam}`,
    );
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Search failed");
      return;
    }
    const rows = (json.results ?? []) as SearchRow[];
    setResults(rows);
    setSelected(new Set(rows.map((r) => r.externalId)));
  }

  async function importSet() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/cards/import-set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        setExternalId: setId,
        collectionId,
        language: source === "tcgdex" ? tcgLanguage : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Import failed");
      return;
    }
    onAdded();
    onClose();
  }

  async function addResult(externalId: string) {
    setLoading(true);
    const res = await fetch("/api/cards/add-to-collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        externalId,
        collectionId,
        language: source === "tcgdex" ? tcgLanguage : undefined,
      }),
    });
    setLoading(false);
    if (res.ok) onAdded();
  }

  async function addSelectedBulk() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/cards/bulk-add-to-collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        externalIds: ids,
        collectionId,
        language: source === "tcgdex" ? tcgLanguage : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Bulk add failed");
      return;
    }
    onAdded();
    onClose();
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.set("collectionId", collectionId);
    form.set("name", manual.name);
    form.set("number", manual.number);
    form.set("setName", manual.setName);
    form.set("rarity", manual.rarity);
    form.set("language", manual.language);
    form.set("category", manual.category);
    form.set("edition", manual.edition);
    form.set("variant", manual.variant);
    const fileInput = document.getElementById("manual-image") as HTMLInputElement | null;
    if (fileInput?.files?.[0]) form.set("image", fileInput.files[0]);
    const res = await fetch("/api/cards/manual", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Could not create card");
      return;
    }
    onAdded();
    onClose();
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-xl font-semibold">Add cards</h2>
          <button type="button" className="btn-ghost py-1" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex gap-2 border-b border-border p-4">
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
        <div className="flex-1 overflow-y-auto p-4">
          {tab !== "manual" && (
            <>
              <label className="mb-3 block text-sm">
                <span className="text-muted">Source</span>
                <select
                  className="input mt-1"
                  value={source}
                  onChange={(e) => setSource(e.target.value as CardSourceId)}
                >
                  <option value="pokemontcg">pokemontcg.io</option>
                  <option value="tcgdex">TCGdex</option>
                </select>
              </label>
              {source === "tcgdex" && (
                <label className="mb-3 block text-sm">
                  <span className="text-muted">TCGdex language</span>
                  <select
                    className="input mt-1"
                    value={tcgLanguage}
                    onChange={(e) => setTcgLanguage(e.target.value as "ja" | "en")}
                  >
                    <option value="ja">Japanese (ja)</option>
                    <option value="en">English (en)</option>
                  </select>
                </label>
              )}
            </>
          )}

          {tab === "search" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Search name or number"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="button" className="btn-primary" onClick={runSearch} disabled={loading}>
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
              <input
                className="input"
                placeholder="Set ID (e.g. gym2, swsh1)"
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
              />
              <button type="button" className="btn-primary" onClick={importSet} disabled={loading || !setId}>
                Import all cards into collection
              </button>
            </div>
          )}

          {tab === "manual" && (
            <form className="space-y-3" onSubmit={createManual}>
              <input className="input" placeholder="Card name" required value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
              <input className="input" placeholder="Number" value={manual.number} onChange={(e) => setManual({ ...manual, number: e.target.value })} />
              <input className="input" placeholder="Set name" value={manual.setName} onChange={(e) => setManual({ ...manual, setName: e.target.value })} />
              <input className="input" placeholder="Rarity" value={manual.rarity} onChange={(e) => setManual({ ...manual, rarity: e.target.value })} />
              <input className="input" placeholder="Language" value={manual.language} onChange={(e) => setManual({ ...manual, language: e.target.value })} />
              <select className="input" value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value as CardCategory })}>
                <option value="official">Official</option>
                <option value="promo">Promo</option>
                <option value="variant">Variant</option>
                <option value="misprint">Misprint</option>
                <option value="custom">Custom</option>
              </select>
              <input className="input" placeholder="Edition" value={manual.edition} onChange={(e) => setManual({ ...manual, edition: e.target.value })} />
              <input className="input" placeholder="Variant label" value={manual.variant} onChange={(e) => setManual({ ...manual, variant: e.target.value })} />
              <input id="manual-image" type="file" accept="image/*" className="text-sm text-muted" />
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                Create & add to collection
              </button>
            </form>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
