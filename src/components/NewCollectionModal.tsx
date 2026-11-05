"use client";

import { CoverImageField } from "@/components/ui/CoverImageField";
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
  const [goal, setGoal] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
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
        goal_count: goal ? Number(goal) : null,
      })
      .select("id, user_id, name, description, cover_image_path, goal_count, sort_order")
      .single();
    if (insertError || !data) {
      setLoading(false);
      setError(insertError?.message ?? "Could not create collection");
      return;
    }

    let coverPath = data.cover_image_path as string | null;
    if (coverFile) {
      const path = `${userData.user.id}/${data.id}-${coverFile.name}`;
      const buf = await coverFile.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("collection-covers")
        .upload(path, buf, { upsert: true });
      if (uploadError) {
        setLoading(false);
        setError(uploadError.message);
        return;
      }
      const { data: updated, error: coverUpdateError } = await supabase
        .from("collections")
        .update({ cover_image_path: path })
        .eq("id", data.id)
        .select("cover_image_path")
        .single();
      if (coverUpdateError) {
        setLoading(false);
        setError(coverUpdateError.message);
        return;
      }
      coverPath = updated?.cover_image_path ?? path;
    }

    setLoading(false);
    onCreated({
      ...data,
      cover_image_path: coverPath,
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
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-6"
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
        <input
          className="input"
          type="number"
          placeholder="Goal count"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <CoverImageField file={coverFile} onFileChange={setCoverFile} />
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
