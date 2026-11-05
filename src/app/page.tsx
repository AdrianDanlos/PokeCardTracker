import { DashboardClient } from "@/components/DashboardClient";
import { listCollections } from "@/lib/data/collections";

export default async function HomePage() {
  const { collections, demo } = await listCollections();
  return <DashboardClient initialCollections={collections} demo={demo} />;
}
