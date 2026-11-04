"use client";

import { createClient } from "@/lib/supabase/client";
import type { CardCondition, CollectionEntryWithCard, OwnedCopyRecord } from "@/lib/types";
import { useEffect, useState } from "react";

const CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

export function CardEditorDrawer({
  entry,
  onClose,
  onUpdated,
}: {
  entry: CollectionEntryWithCard;
  onClose: () => void;
  onUpdated: (entry: CollectionEntryWithCard) => void;
}) {
  const [owned, setOwned] = useState(entry.owned_quantity > 0);
  const [copyId, setCopyId] = useState<string | "new">(entry.owned_copies[0]?.id ?? "new");
  const [quantity, setQuantity] = useState(entry.owned_copies[0]?.quantity ?? 1);
  const [condition, setCondition] = useState<CardCondition>(
    entry.owned_copies[0]?.condition ?? "NM",
  );
  const [language, setLanguage] = useState(
    entry.owned_copies[0]?.language ?? entry.card.language,
  );
  const [edition, setEdition] = useState(
    entry.owned_copies[0]?.edition ?? entry.card.edition ?? "",
  );
  const [variant, setVariant] = useState(
    entry.owned_copies[0]?.variant ?? entry.card.variant ?? "",
  );
  const [price, setPrice] = useState(
    entry.owned_copies[0]?.purchase_price != null
      ? String(entry.owned_copies[0].purchase_price)
      : "",
  );
  const [copyNotes, setCopyNotes] = useState(entry.owned_copies[0]?.notes ?? "");
  const [slotLabel, setSlotLabel] = useState(entry.slot_label ?? "");
  const [entryNotes, setEntryNotes] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOwned(entry.owned_quantity > 0);
    setSlotLabel(entry.slot_label ?? "");
    setEntryNotes(entry.notes ?? "");
    const first = entry.owned_copies[0];
    setCopyId(first?.id ?? "new");
    setQuantity(first?.quantity ?? 1);
    setCondition(first?.condition ?? "NM");
    setLanguage(first?.language ?? entry.card.language);
    setEdition(first?.edition ?? entry.card.edition ?? "");
    setVariant(first?.variant ?? entry.card.variant ?? "");
    setPrice(first?.purchase_price != null ? String(first.purchase_price) : "");
    setCopyNotes(first?.notes ?? "");
  }, [entry]);

  function selectCopy(id: string) {
    setCopyId(id);
    const copy = entry.owned_copies.find((c) => c.id === id);
    if (!copy) return;
    setQuantity(copy.quantity);
    setCondition(copy.condition);
    setLanguage(copy.language ?? entry.card.language);
    setEdition(copy.edition ?? "");
    setVariant(copy.variant ?? "");
    setPrice(copy.purchase_price != null ? String(copy.purchase_price) : "");
    setCopyNotes(copy.notes ?? "");
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return;
    }

    await supabase
      .from("collection_entries")
      .update({
        slot_label: slotLabel.trim() || null,
        notes: entryNotes.trim() || null,
      })
      .eq("id", entry.id);

    if (!owned) {
      await supabase
        .from("owned_copies")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("card_id", entry.card_id);
      onUpdated({
        ...entry,
        slot_label: slotLabel.trim() || null,
        notes: entryNotes.trim() || null,
        owned_quantity: 0,
        owned_copies: [],
        owned_copy: null,
      });
      setSaving(false);
      onClose();
      return;
    }

    const payload = {
      user_id: userData.user.id,
      card_id: entry.card_id,
      condition,
      language: language || null,
      edition: edition || null,
      variant: variant || null,
      quantity,
      purchase_price: price ? Number(price) : null,
      notes: copyNotes || null,
    };

    let savedCopy: OwnedCopyRecord | null = null;
    if (copyId === "new") {
      const { data, error } = await supabase.from("owned_copies").insert(payload).select("*").single();
      if (!error && data) savedCopy = data as OwnedCopyRecord;
    } else {
      const { data, error } = await supabase
        .from("owned_copies")
        .update(payload)
        .eq("id", copyId)
        .select("*")
        .single();
      if (!error && data) savedCopy = data as OwnedCopyRecord;
    }

    const { data: allCopies } = await supabase
      .from("owned_copies")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("card_id", entry.card_id);

    const copies = (allCopies ?? []) as OwnedCopyRecord[];
    const qty = copies.reduce((n, c) => n + c.quantity, 0);

    setSaving(false);
    onUpdated({
      ...entry,
      slot_label: slotLabel.trim() || null,
      notes: entryNotes.trim() || null,
      owned_quantity: qty,
      owned_copies: copies,
      owned_copy: savedCopy ?? copies[0] ?? null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface-elevated p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{entry.card.name}</h2>
            <p className="text-sm text-muted">
              {entry.card.set?.name} · {entry.card.number}
            </p>
          </div>
          <button type="button" className="btn-ghost px-2 py-1" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={owned} onChange={(e) => setOwned(e.target.checked)} />
          Owned
        </label>

        {owned && entry.owned_copies.length > 0 && (
          <label className="mb-3 block text-sm">
            <span className="text-muted">Copy group</span>
            <select
              className="input mt-1"
              value={copyId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "new") {
                  setCopyId("new");
                  setQuantity(1);
                  setCondition("NM");
                  setLanguage(entry.card.language);
                  setEdition(entry.card.edition ?? "");
                  setVariant(entry.card.variant ?? "");
                  setPrice("");
                  setCopyNotes("");
                } else selectCopy(v);
              }}
            >
              {entry.owned_copies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.condition} · {c.edition || "—"} · x{c.quantity}
                </option>
              ))}
              <option value="new">+ New copy group</option>
            </select>
          </label>
        )}

        <div className="grid flex-1 gap-3 overflow-y-auto text-sm">
          <label className="space-y-1">
            <span className="text-muted">Slot label</span>
            <input className="input" value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Entry notes</span>
            <textarea className="input min-h-[60px]" value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Quantity</span>
            <input
              type="number"
              min={0}
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={!owned}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Condition</span>
            <select
              className="input"
              value={condition}
              onChange={(e) => setCondition(e.target.value as CardCondition)}
              disabled={!owned}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted">Language</span>
            <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!owned} />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Edition</span>
            <input className="input" value={edition} onChange={(e) => setEdition(e.target.value)} disabled={!owned} />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Variant</span>
            <input className="input" value={variant} onChange={(e) => setVariant(e.target.value)} disabled={!owned} />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Purchase price</span>
            <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!owned} />
          </label>
          <label className="space-y-1">
            <span className="text-muted">Copy notes</span>
            <textarea className="input min-h-[80px]" value={copyNotes} onChange={(e) => setCopyNotes(e.target.value)} disabled={!owned} />
          </label>
        </div>

        <button type="button" className="btn-primary mt-4 w-full" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
