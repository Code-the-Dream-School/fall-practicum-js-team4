import { ApiError, apiRequest } from './api';

export interface ZipPlace {
  city: string;
  state: string;
  stateCode: string;
  latitude: number;
  longitude: number;
}

export interface ZipLookup {
  zipCode: string;
  places: ZipPlace[];
}

export const lookupZipCode = async (zipCode: string) => {
  const data = await apiRequest<ZipLookup | null>(
    `/api/locations/zip/${encodeURIComponent(zipCode)}`,
  );
  if (!data || !Array.isArray(data.places) || data.places.length === 0) {
    throw new ApiError(
      500,
      'INTERNAL_ERROR',
      'Unexpected response from the server.',
    );
  }
  return data;
};
