import { useQuery } from "@tanstack/react-query";
import { DashboardClient } from "@/components/DashboardClient";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listCollections } from "@/lib/data/collections";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: () => listCollections(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <p className="text-muted">Loading collections…</p>;
  if (error) return <p className="text-red-400">{(error as Error).message}</p>;

  return <DashboardClient initialCollections={data ?? []} />;
}
