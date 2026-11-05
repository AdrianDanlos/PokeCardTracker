const COLLECTION_LOADING_BG = "/collection-loading-bg.png";

export function CollectionLoadingScreen({
  message = "Loading collection…",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[28rem] flex-col items-center justify-center gap-6 px-4 py-10 ${className}`}
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
        {message}
      </p>
    </div>
  );
}
