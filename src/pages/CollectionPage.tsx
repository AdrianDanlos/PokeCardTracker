import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CollectionViewClient } from "@/components/CollectionViewClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getCollectionEntries, getCollectionSummary } from "@/lib/data/collections";
import type { CollectionProgressSummary } from "@/lib/types";

function headerStorageKey(collectionId: string) {
  return `pct-collection-header:${collectionId}`;
}

function readRememberedSummary(collectionId: string): CollectionProgressSummary | null {
  try {
    const raw = sessionStorage.getItem(headerStorageKey(collectionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CollectionProgressSummary>;
    if (parsed.collection_id !== collectionId || typeof parsed.name !== "string") return null;
    return parsed as CollectionProgressSummary;
  } catch {
    return null;
  }
}

function rememberSummary(summary: CollectionProgressSummary) {
  try {
    sessionStorage.setItem(headerStorageKey(summary.collection_id), JSON.stringify(summary));
  } catch {
    // Private mode or a full storage quota should not block the page.
  }
}

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reloadSeq, setReloadSeq] = useState(0);
  const routedCollection = (location.state as { collection?: CollectionProgressSummary } | null)
    ?.collection;
  const routedSummary =
    routedCollection?.collection_id === id ? routedCollection : null;

  const summaryQuery = useQuery({
    queryKey: ["collection-summary", id, user?.id],
    enabled: !!user && !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: () => {
      if (!id) return undefined;
      if (routedSummary) return routedSummary;
      const cached = queryClient
        .getQueryData<CollectionProgressSummary[]>(["collections", user?.id])
        ?.find((c) => c.collection_id === id);
      return cached ?? readRememberedSummary(id) ?? undefined;
    },
    queryFn: async () => {
      const summary = await getCollectionSummary(id!, user!.id);
      if (!summary) throw new Error("Collection not found");
      return summary;
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["collection-entries", id, user?.id, q],
    enabled: !!user && !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: () => getCollectionEntries(id!, user!.id, q || undefined),
  });

  useEffect(() => {
    if (summaryQuery.data) rememberSummary(summaryQuery.data);
  }, [summaryQuery.data]);

  const reloadCollection = useCallback(async () => {
    await Promise.all([summaryQuery.refetch(), entriesQuery.refetch()]);
    setReloadSeq((n) => n + 1);
  }, [summaryQuery, entriesQuery]);

  if (!id) return null;

  if (summaryQuery.isError) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-red-400">{(summaryQuery.error as Error).message}</p>
        <Link to="/" className="text-accent hover:underline">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <CollectionViewClient
      key={id}
      collection={summaryQuery.data ?? null}
      initialEntries={entriesQuery.data ?? []}
      cardsLoading={entriesQuery.isPending}
      cardsError={
        entriesQuery.isError ? (entriesQuery.error as Error).message : null
      }
      reloadSeq={reloadSeq}
      initialSearch={q}
      onReload={() => void reloadCollection()}
      onCollectionDeleted={() => {
        sessionStorage.removeItem(headerStorageKey(id));
        void queryClient.invalidateQueries({ queryKey: ["collections", user?.id] });
        void queryClient.invalidateQueries({ queryKey: ["collection-summary", id, user?.id] });
      }}
      onCollectionUpdated={() => {
        void queryClient.invalidateQueries({ queryKey: ["collections", user?.id] });
        void queryClient.invalidateQueries({ queryKey: ["collection-summary", id, user?.id] });
      }}
      onBinderGapsSaved={(gaps) => {
        queryClient.setQueryData<CollectionProgressSummary>(
          ["collection-summary", id, user?.id],
          (old) => (old ? { ...old, binder_gaps: gaps } : old),
        );
      }}
      onOwnershipChanged={() => {
        void queryClient.invalidateQueries({
          queryKey: ["collection-entries", id, user?.id],
        });
        void queryClient.invalidateQueries({
          queryKey: ["collection-summary", id, user?.id],
        });
        void queryClient.invalidateQueries({
          queryKey: ["collections", user?.id],
        });
      }}
    />
  );
}
