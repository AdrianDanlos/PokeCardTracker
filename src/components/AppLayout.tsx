import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </div>
    </div>
  );
}
