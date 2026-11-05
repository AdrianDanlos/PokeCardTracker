export function CollectionLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-lg text-muted">Loading collection…</p>
    </div>
  );
}
