import { CoverImageField } from "@/components/ui/CoverImageField";

export function ManualCardFormFields({
  name,
  setName,
  onNameChange,
  onSetNameChange,
  imageFile,
  onImageFileChange,
  imagePreviewUrl,
  onImageClear,
  showPhoto = true,
  disabled = false,
  nameAutoFocus = false,
}: {
  name: string;
  setName: string;
  onNameChange: (value: string) => void;
  onSetNameChange: (value: string) => void;
  imageFile?: File | null;
  onImageFileChange?: (file: File | null) => void;
  imagePreviewUrl?: string | null;
  onImageClear?: () => void;
  showPhoto?: boolean;
  disabled?: boolean;
  nameAutoFocus?: boolean;
}) {
  return (
    <>
      <input
        className="input"
        placeholder="Card name"
        required
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={disabled}
        autoFocus={nameAutoFocus}
      />
      <input
        className="input"
        placeholder="Set Name"
        required
        value={setName}
        onChange={(e) => onSetNameChange(e.target.value)}
        disabled={disabled}
      />
      {showPhoto && onImageFileChange != null && (
        <CoverImageField
          label=""
          emptyText="No photo"
          previewAspectClass="aspect-[3/4]"
          previewWrapClassName="mx-auto w-full max-w-[120px]"
          actionsWrapClassName="mx-auto w-full max-w-[120px]"
          emptyTextClassName="text-xs"
          file={imageFile ?? null}
          fallbackPreviewUrl={imagePreviewUrl}
          onFileChange={onImageFileChange}
          onClearPreview={onImageClear}
          disabled={disabled}
        />
      )}
    </>
  );
}
