import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthCodeRedirect } from "@/components/AuthCodeRedirect";
import { AppLayout } from "@/components/AppLayout";
import { HomeRoute } from "@/components/HomeRoute";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { CollectionPage } from "@/pages/CollectionPage";
import { LoginPage } from "@/pages/LoginPage";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthCodeRedirect />
        <Routes>
          <Route
            path="/login"
            element={
              <AuthShell>
                <LoginPage />
              </AuthShell>
            }
          />
          <Route
            path="/auth/callback"
            element={
              <AuthShell>
                <AuthCallbackPage />
              </AuthShell>
            }
          />
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route
              path="/collections/:id"
              element={
                <RequireAuth>
                  <CollectionPage />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
