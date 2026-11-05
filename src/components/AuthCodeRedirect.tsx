import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Supabase sometimes sends users to Site URL root with ?code= instead of /auth/callback.
 * Preserve the query and finish login on the callback route.
 */
export function AuthCodeRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (!code) return;
    if (location.pathname === "/auth/callback") return;

    navigate(
      { pathname: "/auth/callback", search: location.search, hash: location.hash },
      { replace: true },
    );
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
