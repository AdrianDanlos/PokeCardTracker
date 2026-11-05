import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "loading collection",
  "preparing images",
  "creating pokemons",
  "loading evolutions",
] as const;

export function CollectionLoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-lg text-muted">{LOADING_MESSAGES[messageIndex]}</p>
    </div>
  );
}
