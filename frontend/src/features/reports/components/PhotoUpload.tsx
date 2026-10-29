import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { Icon } from '../../../components/Icon';
import {
  PHOTO_LIMITS,
  validatePhotoBatch,
} from '../../../validation/photoRules';
import './PhotoUpload.css';

export interface PhotoUploadProps {
  photos: File[];
  onChange: (photos: File[]) => void;
  error?: string;
  disabled?: boolean;
}

interface PhotoThumbnailProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
  disabled: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PhotoThumbnail({
  file,
  index,
  onRemove,
  disabled,
}: PhotoThumbnailProps) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  const isPrimary = index === 0;

  return (
    <div className="photo-upload__card">
      <div className="photo-upload__thumb-wrap">
        <img
          src={url}
          alt={`Uploaded pet preview ${index + 1}`}
          className="photo-upload__thumb"
        />
        {isPrimary && (
          <span className="photo-upload__primary-badge">★ PRIMARY</span>
        )}
      </div>
      <div className="photo-upload__meta">
        <span className="photo-upload__filename" title={file.name}>
          {file.name}
        </span>
        <span
          className={
            isPrimary
              ? 'photo-upload__role photo-upload__role--primary'
              : 'photo-upload__role'
          }
        >
          {isPrimary
            ? 'Primary Alert Photo'
            : `Angle #${index + 1} • Coat & Profile`}
        </span>
        <span className="photo-upload__size">
          {formatFileSize(file.size)} • Complete
        </span>
      </div>
      <button
        type="button"
        className="photo-upload__remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        disabled={disabled}
        aria-label={`Remove photo ${index + 1}`}
        title={`Remove ${file.name}`}
      >
        <Icon name="delete" />
      </button>
    </div>
  );
}

export function PhotoUpload({
  photos,
  onChange,
  error: externalError,
  disabled = false,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFull = photos.length >= PHOTO_LIMITS.maxPhotos;
  const isDisabled = disabled || isFull;

  const handleFilesSelected = useCallback(
    (incomingFiles: FileList | File[] | null) => {
      if (!incomingFiles || incomingFiles.length === 0 || isDisabled) return;

      const fileList = Array.from(incomingFiles);
      const { validFiles, errors } = validatePhotoBatch(
        fileList,
        photos.length,
      );

      if (errors.length > 0) {
        setValidationErrors(errors);
      } else {
        setValidationErrors([]);
      }

      if (validFiles.length > 0) {
        onChange([...photos, ...validFiles]);
      }
    },
    [isDisabled, onChange, photos],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isDisabled) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleZoneClick = () => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleZoneKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
      e.preventDefault();
      handleZoneClick();
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, i) => i !== indexToRemove);
    onChange(updated);
    setValidationErrors([]);
  };

  const dropzoneClasses = [
    'photo-upload__dropzone',
    isDragging ? 'photo-upload__dropzone--dragging' : '',
    isDisabled ? 'photo-upload__dropzone--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className="photo-upload"
      aria-labelledby="photo-upload-section-label"
    >
      <div className="photo-upload__header">
        <span id="photo-upload-section-label" className="photo-upload__eyebrow">
          <Icon name="center_focus_strong" />
          02 // VISUAL IDENTITY TELEMETRY
        </span>
        <span
          className={
            isFull
              ? 'photo-upload__counter photo-upload__counter--full'
              : 'photo-upload__counter'
          }
        >
          {photos.length} / {PHOTO_LIMITS.maxPhotos} photos • Max 5 MB each (25
          MB total)
        </span>
      </div>

      <input
        ref={fileInputRef}
        id="pet-photo-file-input"
        type="file"
        multiple
        accept={PHOTO_LIMITS.allowedMimeTypes.join(',')}
        onChange={handleInputChange}
        disabled={isDisabled}
        className="photo-upload__input"
        aria-label="Upload pet photos"
      />

      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        aria-label="Drag and drop pet photographs here, or browse computer"
        onClick={handleZoneClick}
        onKeyDown={handleZoneKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={dropzoneClasses}
      >
        <div className="photo-upload__emblem" aria-hidden="true">
          <Icon name="cloud_upload" />
        </div>
        <h3 className="photo-upload__title">
          {isFull ? (
            'Maximum photo limit reached (5 photos)'
          ) : isDragging ? (
            'Drop photos here'
          ) : (
            <>
              Drag &amp; drop pet photographs here, or{' '}
              <span className="photo-upload__browse">Browse Computer</span>
            </>
          )}
        </h3>
        <p className="photo-upload__subtitle">
          High-contrast daylight angles yield 4× faster recognition. Multiple
          angles recommended for coat, muzzle, and ear patterns.
        </p>
        <div className="photo-upload__tags">
          <span className="photo-upload__tag">PNG</span>
          <span className="photo-upload__tag">JPG</span>
          <span className="photo-upload__tag">WEBP</span>
          <span className="photo-upload__dot" aria-hidden="true">
            •
          </span>
          <span>Up to 5 MB each (max {PHOTO_LIMITS.maxPhotos} photos)</span>
        </div>
      </div>

      {(externalError || validationErrors.length > 0) && (
        <div role="alert" className="photo-upload__errors">
          <Icon name="error" />
          <div className="photo-upload__error-list">
            {externalError && <div>{externalError}</div>}
            {validationErrors.map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="photo-upload__gallery">
          <span className="photo-upload__gallery-label">
            Indexed Image Assets ({photos.length} Loaded)
          </span>
          <div className="photo-upload__grid">
            {photos.map((photo, index) => (
              <PhotoThumbnail
                key={`${photo.name}-${photo.size}-${photo.lastModified}`}
                file={photo}
                index={index}
                onRemove={handleRemovePhoto}
                disabled={disabled}
              />
            ))}
            {!isFull && (
              <button
                type="button"
                className="photo-upload__add-slot"
                onClick={handleZoneClick}
                disabled={isDisabled}
              >
                <Icon name="add_photo_alternate" />
                <span>+ Add Distinct Marking</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
