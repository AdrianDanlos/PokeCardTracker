"use client";

import { createClient } from "@/lib/supabase/client";
import type { CollectionProgressSummary } from "@/lib/types";
import { useState } from "react";

export function CollectionSettingsModal({
  collection,
  onClose,
  onUpdated,
}: {
  collection: CollectionProgressSummary;
  onClose: () => void;
  onUpdated: (c: CollectionProgressSummary) => void;
}) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [goal, setGoal] = useState(collection.goal_count?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (collection.collection_id.startsWith("demo-")) {
      onClose();
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("collections")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        goal_count: goal ? Number(goal) : null,
      })
      .eq("id", collection.collection_id)
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      onUpdated({
        ...collection,
        name: data.name,
        description: data.description,
        goal_count: data.goal_count,
      });
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={save}
        className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-surface-elevated p-6"
      >
        <h2 className="text-xl font-semibold">Collection settings</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="input" type="number" placeholder="Goal count" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <input type="file" accept="image/*" className="text-sm text-muted" disabled title="Cover upload via Storage — use Supabase signed URL flow" />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
