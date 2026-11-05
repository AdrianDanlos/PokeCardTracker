import { useEffect, useId, useRef, useState } from "react";

export type FilterSelectOption = { value: string; label: string };

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function optionButtonClass(selected: boolean, active: boolean) {
  return `flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
    selected
      ? "bg-accent/15 font-medium text-foreground ring-1 ring-inset ring-accent/30"
      : active
        ? "bg-surface text-foreground"
        : "text-foreground hover:bg-surface"
  }`;
}

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
  disabled,
  className = "",
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: FilterSelectOption[];
  allLabel: string;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const menuItems: { value: string | null; label: string }[] = [
    { value: null, label: allLabel },
    ...options.map((o) => ({ value: o.value, label: o.label })),
  ];

  const selectedLabel =
    menuItems.find((item) => item.value === value)?.label ?? allLabel;

  useEffect(() => {
    const idx = menuItems.findIndex((item) => item.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [value, options, allLabel]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  function pick(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, menuItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(menuItems[activeIndex]?.value ?? null);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        className={`inline-flex max-w-[14rem] min-w-[8rem] cursor-pointer items-center justify-between gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
          value
            ? "text-foreground ring-1 ring-accent/40"
            : "text-muted hover:text-foreground"
        }`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-52 w-max min-w-full max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-surface-elevated py-1 shadow-lg"
          onKeyDown={onListKeyDown}
        >
          {menuItems.map((item, index) => {
            const selected = item.value === value;
            return (
              <li key={item.value ?? "__all__"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`cursor-pointer ${optionButtonClass(selected, index === activeIndex)}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {selected ? (
                    <span className="shrink-0 text-xs text-accent" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
