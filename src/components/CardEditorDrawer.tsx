"use client";

import { createClient } from "@/lib/supabase/client";
import type { CardCondition, CollectionEntryWithCard } from "@/lib/types";
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
  const [quantity, setQuantity] = useState(entry.owned_quantity || 1);
  const [condition, setCondition] = useState<CardCondition>(
    entry.owned_copy?.condition ?? "NM",
  );
  const [language, setLanguage] = useState(entry.owned_copy?.language ?? entry.card.language);
  const [edition, setEdition] = useState(entry.owned_copy?.edition ?? entry.card.edition ?? "");
  const [variant, setVariant] = useState(entry.owned_copy?.variant ?? entry.card.variant ?? "");
  const [price, setPrice] = useState(
    entry.owned_copy?.purchase_price != null ? String(entry.owned_copy.purchase_price) : "",
  );
  const [notes, setNotes] = useState(entry.owned_copy?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOwned(entry.owned_quantity > 0);
    setQuantity(entry.owned_quantity || 1);
  }, [entry]);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return;
    }
    if (!owned) {
      await supabase
        .from("owned_copies")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("card_id", entry.card_id);
      onUpdated({ ...entry, owned_quantity: 0, owned_copy: null });
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
      notes: notes || null,
    };
    const { data, error } = await supabase
      .from("owned_copies")
      .upsert(payload, { onConflict: "user_id,card_id" })
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      onUpdated({
        ...entry,
        owned_quantity: quantity,
        owned_copy: data,
      });
      onClose();
    }
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

        <div className="grid flex-1 gap-3 overflow-y-auto text-sm">
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
            <span className="text-muted">Notes</span>
            <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!owned} />
          </label>
        </div>

        <button type="button" className="btn-primary mt-4 w-full" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
