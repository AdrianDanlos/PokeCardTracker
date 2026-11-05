import { coverImageSrc } from "@/lib/images";
import { useEffect, useId, useState } from "react";

export function CoverImageField({
  label = "Cover image",
  emptyText = "No cover",
  previewAspectClass = "aspect-[16/10]",
  previewWrapClassName = "w-full",
  actionsWrapClassName = "w-full",
  emptyTextClassName = "text-sm",
  existingCoverPath,
  fallbackPreviewUrl,
  file,
  onFileChange,
  disabled = false,
}: {
  label?: string;
  emptyText?: string;
  previewAspectClass?: string;
  previewWrapClassName?: string;
  actionsWrapClassName?: string;
  emptyTextClassName?: string;
  existingCoverPath?: string | null;
  /** Shown when no new file is picked (e.g. card image URL or cached path). */
  fallbackPreviewUrl?: string | null;
  file?: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl =
    objectUrl ??
    (existingCoverPath ? coverImageSrc(existingCoverPath) : null) ??
    fallbackPreviewUrl ??
    null;
  const fileLabel = file?.name;

  const showLabel = label.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {showLabel && <p className="text-sm font-medium text-foreground">{label}</p>}

      <label
        htmlFor={inputId}
        className={`flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface ${previewAspectClass} ${previewWrapClassName} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-accent/40"
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`text-muted ${emptyTextClassName}`}>{emptyText}</span>
        )}
      </label>

      {fileLabel ? (
        <p
          className={`truncate text-center text-xs text-muted ${actionsWrapClassName}`}
          title={fileLabel}
        >
          {fileLabel}
        </p>
      ) : null}

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          onFileChange(picked);
          e.target.value = "";
        }}
      />
    </div>
  );
}
