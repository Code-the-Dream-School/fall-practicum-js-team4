import { describe, expect, it } from 'vitest';
import {
  PHOTO_LIMITS,
  validatePhotoBatch,
  validatePhotoFile,
} from './photoRules';

describe('photoRules', () => {
  it('exposes expected limits aligned with backend', () => {
    expect(PHOTO_LIMITS.maxPhotos).toBe(5);
    expect(PHOTO_LIMITS.maxSizeBytes).toBe(5 * 1024 * 1024);
    expect(PHOTO_LIMITS.allowedMimeTypes).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
  });

  describe('validatePhotoFile', () => {
    it('accepts valid JPEG, PNG, and WebP files within 5MB', () => {
      const jpg = new File(['valid content'], 'dog.jpg', {
        type: 'image/jpeg',
      });
      const png = new File(['valid content'], 'cat.png', { type: 'image/png' });
      const webp = new File(['valid content'], 'pet.webp', {
        type: 'image/webp',
      });

      expect(validatePhotoFile(jpg)).toEqual({ valid: true });
      expect(validatePhotoFile(png)).toEqual({ valid: true });
      expect(validatePhotoFile(webp)).toEqual({ valid: true });
    });

    it('rejects unsupported mime types like GIF, PDF, text', () => {
      const gif = new File(['gif content'], 'pet.gif', { type: 'image/gif' });
      const pdf = new File(['pdf content'], 'pet.pdf', {
        type: 'application/pdf',
      });
      const txt = new File(['txt content'], 'pet.txt', { type: 'text/plain' });

      expect(validatePhotoFile(gif).valid).toBe(false);
      expect(validatePhotoFile(gif).error).toContain('unsupported format');
      expect(validatePhotoFile(pdf).valid).toBe(false);
      expect(validatePhotoFile(txt).valid).toBe(false);
    });

    it('rejects files larger than 5MB', () => {
      const bigBuffer = new Uint8Array(5 * 1024 * 1024 + 1);
      const bigFile = new File([bigBuffer], 'huge.jpg', { type: 'image/jpeg' });

      const result = validatePhotoFile(bigFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('larger than 5 MB');
    });

    it('rejects empty files (0 bytes)', () => {
      const emptyFile = new File([], 'empty.png', { type: 'image/png' });

      const result = validatePhotoFile(emptyFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is empty');
    });
  });

  describe('validatePhotoBatch', () => {
    it('allows valid batch when within limits', () => {
      const file1 = new File(['img1'], 'pic1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['img2'], 'pic2.png', { type: 'image/png' });

      const { validFiles, errors } = validatePhotoBatch([file1, file2], 0);
      expect(validFiles).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('rejects when user already has maximum 5 photos', () => {
      const file = new File(['img'], 'pic.jpg', { type: 'image/jpeg' });

      const { validFiles, errors } = validatePhotoBatch([file], 5);
      expect(validFiles).toHaveLength(0);
      expect(errors[0]).toContain('Maximum of 5 photos allowed');
    });

    it('truncates excess photos when new batch exceeds remaining slots', () => {
      const file1 = new File(['img1'], 'pic1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['img2'], 'pic2.jpg', { type: 'image/jpeg' });
      const file3 = new File(['img3'], 'pic3.jpg', { type: 'image/jpeg' });

      // Currently has 3, slots remaining = 2
      const { validFiles, errors } = validatePhotoBatch(
        [file1, file2, file3],
        3,
      );
      expect(validFiles).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Only 2 more photo(s) can be added');
    });

    it('collects individual file validation errors while keeping valid ones', () => {
      const valid = new File(['ok'], 'ok.jpg', { type: 'image/jpeg' });
      const invalidType = new File(['bad'], 'bad.gif', { type: 'image/gif' });

      const { validFiles, errors } = validatePhotoBatch(
        [valid, invalidType],
        0,
      );
      expect(validFiles).toHaveLength(1);
      expect(validFiles[0].name).toBe('ok.jpg');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('unsupported format');
    });
  });
});
