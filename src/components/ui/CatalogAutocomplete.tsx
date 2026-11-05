import { useEffect, useId, useRef, useState } from "react";

export type CatalogAutocompleteOption = {
  id: string;
  label: string;
  detail?: string;
  imageUrl?: string | null;
};

function CardArtAvailableIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="M21 15l-5-5L5 19" />
    </svg>
  );
}

export function CatalogAutocomplete({
  value,
  onChange,
  options,
  loading,
  placeholder,
  onSelect,
  minChars = 1,
  disabled,
  required,
  dropDirection = "down",
}: {
  value: string;
  onChange: (value: string) => void;
  options: CatalogAutocompleteOption[];
  loading?: boolean;
  placeholder?: string;
  onSelect: (option: CatalogAutocompleteOption) => void;
  minChars?: number;
  disabled?: boolean;
  required?: boolean;
  /** inline = list in layout (pushes content below); up/down = floating overlay */
  dropDirection?: "down" | "up" | "inline";
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmed = value.trim();
  const showPanel =
    open && trimmed.length >= minChars && (loading || options.length > 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  function pick(option: CatalogAutocompleteOption) {
    onSelect(option);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPanel || options.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(options[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listPanel = showPanel ? (
    <ul
      id={listId}
      role="listbox"
      className={
        dropDirection === "inline"
          ? "mt-2 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
          : dropDirection === "up"
            ? "absolute bottom-full z-30 mb-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
            : "absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
      }
    >
      {loading && options.length === 0 && (
        <li className="px-3 py-2 text-sm text-muted">Loading…</li>
      )}
      {options.map((opt, index) => (
        <li key={opt.id} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface ${
              index === activeIndex ? "bg-surface" : ""
            }`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(opt)}
            onMouseEnter={() => setActiveIndex(index)}
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate">{opt.label}</span>
              {opt.detail && (
                <span className="block truncate text-xs text-muted">{opt.detail}</span>
              )}
            </div>
            {opt.imageUrl ? (
              <span
                className="shrink-0 text-accent/80"
                title="Card art available"
                aria-label="Card art available"
              >
                <CardArtAvailableIcon className="h-5 w-5" />
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`min-w-0 flex-1 ${dropDirection === "inline" ? "w-full" : "relative"}`}
    >
      <input
        className="input w-full"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />
      {listPanel}
    </div>
  );
}
