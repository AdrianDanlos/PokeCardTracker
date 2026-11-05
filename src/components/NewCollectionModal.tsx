"use client";

import { createClient } from "@/lib/supabase/client";
import type { CollectionProgressSummary } from "@/lib/types";
import { useState } from "react";

export function NewCollectionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (col: CollectionProgressSummary) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Sign in with magic link to create collections.");
      setLoading(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("collections")
      .insert({
        user_id: userData.user.id,
        name: name.trim(),
        description: description.trim() || null,
      })
      .select("id, user_id, name, description, cover_image_path, goal_count, sort_order")
      .single();
    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "Could not create collection");
      return;
    }
    onCreated({
      ...data,
      collection_id: data.id,
      total_entries: 0,
      owned_entries: 0,
      owned_percent: 0,
    } as CollectionProgressSummary);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface-elevated p-6"
      >
        <h2 className="text-xl font-semibold">New collection</h2>
        <input
          className="input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="input min-h-[80px]"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
