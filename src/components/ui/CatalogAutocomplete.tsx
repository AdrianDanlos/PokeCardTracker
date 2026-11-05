import { useEffect, useId, useRef, useState } from "react";

export type CatalogAutocompleteOption = {
  id: string;
  label: string;
  detail?: string;
};

export function CatalogAutocomplete({
  value,
  onChange,
  options,
  loading,
  placeholder,
  onSelect,
  minChars = 1,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: CatalogAutocompleteOption[];
  loading?: boolean;
  placeholder?: string;
  onSelect: (option: CatalogAutocompleteOption) => void;
  minChars?: number;
  disabled?: boolean;
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
    function onDocPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, []);

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

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <input
        className="input w-full"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
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
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />
      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
        >
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">Loading…</li>
          )}
          {options.map((opt, index) => (
            <li key={opt.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-surface ${
                  index === activeIndex ? "bg-surface" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="truncate">{opt.label}</span>
                {opt.detail && <span className="truncate text-xs text-muted">{opt.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
