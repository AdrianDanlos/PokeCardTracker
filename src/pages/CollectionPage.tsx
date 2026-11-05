import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { CollectionViewClient } from "@/components/CollectionViewClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getCollectionEntries,
  getCollectionSummary,
  getProgressBreakdown,
} from "@/lib/data/collections";

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { user, loading: authLoading } = useAuth();

  const queryKey = ["collection", id, user?.id, q];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: !!user && !!id,
    queryFn: async () => {
      const summary = await getCollectionSummary(id!, user!.id);
      if (!summary) throw new Error("Collection not found");
      const [entries, breakdown] = await Promise.all([
        getCollectionEntries(id!, user!.id, q || undefined),
        getProgressBreakdown(id!),
      ]);
      return { summary, entries, breakdown };
    },
  });

  if (authLoading) return <p className="text-muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!id) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-muted">Loading collection…</p>;
  if (error || !data) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-red-400">{(error as Error)?.message ?? "Not found"}</p>
        <Link to="/" className="text-accent hover:underline">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <CollectionViewClient
      collection={data.summary}
      initialEntries={data.entries}
      breakdown={data.breakdown}
      initialSearch={q}
      onReload={() => void refetch()}
    />
  );
}
