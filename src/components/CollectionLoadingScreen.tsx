const COLLECTION_LOADING_BG = "/collection-loading-bg.png";

export function CollectionLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-background px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img
        src={COLLECTION_LOADING_BG}
        alt=""
        className="pointer-events-none max-h-[32vh] w-auto max-w-[min(220px,70vw)] object-contain"
        aria-hidden
      />
      <p className="rounded-lg bg-background/80 px-4 py-2 text-lg text-muted backdrop-blur-sm">
        Loading collection…
      </p>
    </div>
  );
}
