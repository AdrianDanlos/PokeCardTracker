import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardClient } from "@/components/DashboardClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listCollections } from "@/lib/data/collections";
import type { CollectionProgressSummary } from "@/lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const fromCollection = Boolean(
    (location.state as { fromCollection?: boolean } | null)?.fromCollection,
  );
  const [returningFromCollection, setReturningFromCollection] =
    useState(fromCollection);
  const queryKey = ["collections", user?.id] as const;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => listCollections(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (fromCollection) setReturningFromCollection(true);
  }, [fromCollection]);

  useEffect(() => {
    if (!returningFromCollection) return;
    if (isLoading || isFetching) return;
    const t = window.setTimeout(() => {
      setReturningFromCollection(false);
      navigate(".", { replace: true, state: {} });
    }, 350);
    return () => clearTimeout(t);
  }, [returningFromCollection, isLoading, isFetching, navigate]);

  const showLoadingScreen = isLoading || returningFromCollection;

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
      collectionsLoading={showLoadingScreen}
      loadError={error ? (error as Error).message : null}
      onCollectionCreated={onCollectionCreated}
      onCollectionDeleted={onCollectionDeleted}
    />
  );
}
