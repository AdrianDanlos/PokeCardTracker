import { CollectionViewClient } from "@/components/CollectionViewClient";
import { AuthBanner } from "@/components/AuthBanner";
import {
  getCollectionEntries,
  getCollectionMeta,
  getProgressBreakdown,
} from "@/lib/data/collections";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [meta, { entries, demo }, breakdown] = await Promise.all([
    getCollectionMeta(id),
    getCollectionEntries(id),
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
      />
    </>
  );
}
