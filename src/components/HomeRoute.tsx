import { Navigate, useSearchParams } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";
import { RequireAuth } from "@/lib/auth/RequireAuth";

export function HomeRoute() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("code")) {
    return <Navigate to={`/auth/callback?${searchParams.toString()}`} replace />;
  }
  return (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  );
}
