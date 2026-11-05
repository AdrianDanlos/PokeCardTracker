import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardClient } from "@/components/DashboardClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listCollections } from "@/lib/data/collections";
import type { CollectionProgressSummary } from "@/lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["collections", user?.id] as const;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => listCollections(user!.id),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const collectionsPending = isLoading && data === undefined;

  function onCollectionCreated(col: CollectionProgressSummary) {
    queryClient.setQueryData<CollectionProgressSummary[]>(queryKey, (prev) => {
      if (!prev) return [col];
      if (prev.some((c) => c.collection_id === col.collection_id)) return prev;
      return [...prev, col];
    });
    void refetch();
  }

  function onCollectionDeleted(collectionId: string) {
    queryClient.setQueryData<CollectionProgressSummary[]>(queryKey, (prev) =>
      prev ? prev.filter((c) => c.collection_id !== collectionId) : prev,
    );
    void refetch();
  }

  return (
    <DashboardClient
      initialCollections={data ?? []}
      collectionsPending={collectionsPending}
      loadError={error ? (error as Error).message : null}
      onCollectionCreated={onCollectionCreated}
      onCollectionDeleted={onCollectionDeleted}
    />
  );
}
