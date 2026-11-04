import { DashboardClient } from "@/components/DashboardClient";
import { AuthBanner } from "@/components/AuthBanner";
import { listCollections } from "@/lib/data/collections";

export default async function HomePage() {
  const { collections, demo, requiresAuth } = await listCollections();
  return (
    <>
      <AuthBanner />
      <DashboardClient
        initialCollections={collections}
        demo={demo}
        requiresAuth={requiresAuth}
      />
    </>
  );
}
