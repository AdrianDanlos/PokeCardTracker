import { CollectionViewClient } from "@/components/CollectionViewClient";
import { AuthBanner } from "@/components/AuthBanner";
import {
  getCollectionEntries,
  getCollectionMeta,
  getProgressBreakdown,
} from "@/lib/data/collections";

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const [meta, { entries, demo, requiresAuth }, breakdown] = await Promise.all([
    getCollectionMeta(id),
    getCollectionEntries(id, { search: q }),
    getProgressBreakdown(id),
  ]);

  return (
    <>
      <AuthBanner />
      <CollectionViewClient
        collection={meta}
        initialEntries={entries}
        breakdown={breakdown}
        demo={demo}
        requiresAuth={requiresAuth}
        initialSearch={q ?? ""}
      />
    </>
  );
}
