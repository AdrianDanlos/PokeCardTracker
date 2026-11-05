import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CollectionLoadingScreen } from "@/components/CollectionLoadingScreen";
import { CollectionViewClient } from "@/components/CollectionViewClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getCollectionEntries, getCollectionSummary } from "@/lib/data/collections";

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reloadSeq, setReloadSeq] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["collection", id, user?.id, q],
    enabled: !!user && !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const summary = await getCollectionSummary(id!, user!.id);
      if (!summary) throw new Error("Collection not found");
      const entries = await getCollectionEntries(id!, user!.id, q || undefined);
      return { summary, entries };
    },
  });

  const reloadCollection = useCallback(async () => {
    await refetch();
    setReloadSeq((n) => n + 1);
  }, [refetch]);

  if (!id) return null;
  if (isLoading) return <CollectionLoadingScreen />;
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
      key={id}
      collection={data.summary}
      initialEntries={data.entries}
      reloadSeq={reloadSeq}
      initialSearch={q}
      onReload={() => void reloadCollection()}
      onCollectionDeleted={() => {
        void queryClient.invalidateQueries({ queryKey: ["collections", user?.id] });
      }}
    />
  );
}
