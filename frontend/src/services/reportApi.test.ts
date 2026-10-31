import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API, server } from '../test/server';
import { ApiError } from './api';
import { createReport, describeReportError } from './reportApi';
import type { CreateReportInput } from '../types/reports';

const sampleInput: CreateReportInput = {
  reportType: 'LOST',
  petType: 'DOG',
  petName: 'Buddy',
  color: 'Golden',
  size: 'MEDIUM',
  gender: 'MALE',
  eventDate: '2026-10-25',
};

describe('reportApi', () => {
  it('sends JSON when no photos are provided', async () => {
    let capturedBody: unknown = null;
    let contentType = '';

    server.use(
      http.post(`${API}/api/reports`, async ({ request }) => {
        contentType = request.headers.get('content-type') || '';
        capturedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { petReportId: 10, ...sampleInput },
        });
      }),
    );

    const result = await createReport(sampleInput);
    expect(result.petReportId).toBe(10);
    expect(contentType).toContain('application/json');
    expect(capturedBody).toEqual(sampleInput);
  });

  it('sends multipart/form-data with "report" string and "photos" files when photos are attached', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            petReportId: 11,
            ...sampleInput,
            photos: [
              {
                petPhotoId: 1,
                imageUrl: 'https://example.com/p1.webp',
                createdAt: '2026-10-25T12:00:00.000Z',
              },
            ],
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const photo1 = new File(['dog image 1'], 'dog.jpg', { type: 'image/jpeg' });
    const photo2 = new File(['dog image 2'], 'dog2.png', { type: 'image/png' });

    const result = await createReport(sampleInput, {
      photos: [photo1, photo2],
    });

    expect(result.petReportId).toBe(11);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe(`${API}/api/reports`);
    expect(calledInit?.method).toBe('POST');
    expect(calledInit?.credentials).toBe('include');
    // No manual Content-Type header so browser adds multipart boundary
    expect(calledInit?.headers).toEqual({});

    const formData = calledInit?.body as FormData;
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('report')).toBe(JSON.stringify(sampleInput));
    expect(formData.getAll('photos')).toHaveLength(2);
  });

  describe('describeReportError', () => {
    it('maps PHOTO_UPLOAD_FAILED to a retry message', () => {
      const err = new ApiError(
        502,
        'PHOTO_UPLOAD_FAILED',
        'Could not upload photos',
      );
      expect(describeReportError(err)).toBe(
        'Could not upload photos to storage. Please try again.',
      );
    });

    it('maps REPORT_LIMIT_REACHED and TOO_MANY_REQUESTS', () => {
      expect(
        describeReportError(
          new ApiError(403, 'REPORT_LIMIT_REACHED', 'Limit reached'),
        ),
      ).toContain('maximum of 100 reports');

      expect(
        describeReportError(
          new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many requests'),
        ),
      ).toContain('Too many reports submitted recently');
    });

    it('extracts field-specific photo validation error for both "photos" and "photos.N"', () => {
      const multerErr = new ApiError(400, 'VALIDATION_ERROR', 'Invalid data', [
        {
          field: 'photos',
          message: 'Photo must be a JPEG, PNG or WebP image',
        },
      ]);
      expect(describeReportError(multerErr)).toBe(
        'Photo must be a JPEG, PNG or WebP image',
      );

      const storePhotosErr = new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid data',
        [
          {
            field: 'photos.1',
            message: 'Photo 2 is damaged or cannot be read',
          },
        ],
      );
      expect(describeReportError(storePhotosErr)).toBe(
        'Photo 2 is damaged or cannot be read',
      );
    });

    it('handles generic validation errors, network errors, and non-ApiErrors', () => {
      const generalValidation = new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid data',
        [{ field: 'color', message: '"color" is required' }],
      );
      expect(describeReportError(generalValidation)).toBe(
        'Please check the report details and try again.',
      );

      const networkErr = new ApiError(0, 'NETWORK_ERROR', 'Offline');
      expect(describeReportError(networkErr)).toBe('Offline');

      expect(describeReportError(new Error('boom'))).toBe(
        'Something went wrong. Please try again.',
      );
    });
  });
});
