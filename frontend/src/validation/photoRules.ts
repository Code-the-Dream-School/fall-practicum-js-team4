export const PHOTO_LIMITS = {
  maxPhotos: 5,
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

export type AllowedMimeType = (typeof PHOTO_LIMITS.allowedMimeTypes)[number];

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

export function getPhotoKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export function validatePhotoFile(file: File): PhotoValidationResult {
  const isAllowedType = (
    PHOTO_LIMITS.allowedMimeTypes as readonly string[]
  ).includes(file.type);
  if (!isAllowedType) {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format. Only JPEG, PNG, and WebP are allowed.`,
    };
  }

  if (file.size > PHOTO_LIMITS.maxSizeBytes) {
    return {
      valid: false,
      error: `"${file.name}" is larger than 5 MB (size: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `"${file.name}" is empty.`,
    };
  }

  return { valid: true };
}

export function validatePhotoBatch(
  newFiles: File[],
  existingPhotos: File[] | number = [],
): { validFiles: File[]; errors: string[] } {
  const errors: string[] = [];
  const validFiles: File[] = [];

  const currentPhotosCount =
    typeof existingPhotos === 'number' ? existingPhotos : existingPhotos.length;

  const availableSlots = PHOTO_LIMITS.maxPhotos - currentPhotosCount;
  if (availableSlots <= 0) {
    return {
      validFiles: [],
      errors: [
        `Maximum of ${PHOTO_LIMITS.maxPhotos} photos allowed per report.`,
      ],
    };
  }

  const seenKeys = new Set<string>(
    typeof existingPhotos === 'number' ? [] : existingPhotos.map(getPhotoKey),
  );
  let slotsRemaining = availableSlots;

  for (const file of newFiles) {
    const key = getPhotoKey(file);
    if (seenKeys.has(key)) {
      errors.push(`"${file.name}" has already been added.`);
      continue;
    }

    if (slotsRemaining <= 0) {
      errors.push(
        `Only ${availableSlots} more photo(s) can be added (maximum ${PHOTO_LIMITS.maxPhotos}). "${file.name}" was skipped.`,
      );
      continue;
    }

    const result = validatePhotoFile(file);
    if (!result.valid && result.error) {
      errors.push(result.error);
    } else {
      seenKeys.add(key);
      validFiles.push(file);
      slotsRemaining--;
    }
  }

  return { validFiles, errors };
}
