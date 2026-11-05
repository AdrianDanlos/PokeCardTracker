import { CoverImageField } from "@/components/ui/CoverImageField";
import {
  CatalogAutocomplete,
  type CatalogAutocompleteOption,
} from "@/components/ui/CatalogAutocomplete";
import { useMemo } from "react";

export function ManualCardFormFields({
  name,
  setName,
  onNameChange,
  onSetNameChange,
  collectionSetNames = [],
  imageFile,
  onImageFileChange,
  imagePreviewUrl,
  showPhoto = true,
  disabled = false,
  nameAutoFocus = false,
}: {
  name: string;
  setName: string;
  onNameChange: (value: string) => void;
  onSetNameChange: (value: string) => void;
  /** Set names already used in this collection (shown on focus / click). */
  collectionSetNames?: string[];
  imageFile?: File | null;
  onImageFileChange?: (file: File | null) => void;
  imagePreviewUrl?: string | null;
  showPhoto?: boolean;
  disabled?: boolean;
  nameAutoFocus?: boolean;
}) {
  const setNameOptions = useMemo((): CatalogAutocompleteOption[] => {
    const q = setName.trim().toLowerCase();
    const filtered = q
      ? collectionSetNames.filter((label) => label.toLowerCase().includes(q))
      : collectionSetNames;
    return filtered.map((label) => ({ id: label, label }));
  }, [collectionSetNames, setName]);

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
      {collectionSetNames.length > 0 ? (
        <div className="relative w-full">
          <CatalogAutocomplete
            value={setName}
            onChange={onSetNameChange}
            options={setNameOptions}
            minChars={0}
            dropDirection="down"
            placeholder="Set name"
            disabled={disabled}
            required
            onSelect={(opt) => onSetNameChange(opt.label)}
          />
        </div>
      ) : (
        <input
          className="input"
          placeholder="Set name"
          required
          value={setName}
          onChange={(e) => onSetNameChange(e.target.value)}
          disabled={disabled}
        />
      )}
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
          disabled={disabled}
        />
      )}
    </>
  );
}
