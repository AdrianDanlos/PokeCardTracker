/** Local dev only: anonymous guest when VITE_DEV_GUEST=true; otherwise use magic link like prod. */
export function isLocalDevGuestMode() {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_GUEST === "true";
}
