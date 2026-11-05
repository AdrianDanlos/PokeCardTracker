import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CollectionViewClient } from "@/components/CollectionViewClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getCollectionEntries, getCollectionSummary } from "@/lib/data/collections";

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["collection", id, user?.id, q],
    enabled: !!user && !!id,
    queryFn: async () => {
      const summary = await getCollectionSummary(id!, user!.id);
      if (!summary) throw new Error("Collection not found");
      const entries = await getCollectionEntries(id!, user!.id, q || undefined);
      return { summary, entries };
    },
  });

  if (!id) return null;
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
      initialSearch={q}
      onReload={() => void refetch()}
    />
  );
}
