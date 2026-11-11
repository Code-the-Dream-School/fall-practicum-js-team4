import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  API,
  errorResponse,
  server,
  zipLookupResponse,
  zipPlace,
} from '../test/server';
import { lookupZipCode } from './locationApi';

const raleigh = zipPlace('Raleigh', 'North Carolina', 'NC');

describe('lookupZipCode', () => {
  it('asks for one ZIP code and returns its places', async () => {
    let requestedZip: string | undefined;
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, ({ params }) => {
        requestedZip = String(params.zip);
        return zipLookupResponse('27601', [raleigh]);
      }),
    );

    const data = await lookupZipCode('27601');

    expect(requestedZip).toBe('27601');
    expect(data.places).toEqual([raleigh]);
  });

  it('rejects with ZIP_NOT_FOUND for an unknown ZIP code', async () => {
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, () =>
        errorResponse(404, 'ZIP_NOT_FOUND', 'Zip code not found'),
      ),
    );

    await expect(lookupZipCode('00000')).rejects.toMatchObject({
      status: 404,
      code: 'ZIP_NOT_FOUND',
    });
  });

  it('rejects a success response without places', async () => {
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, () =>
        HttpResponse.json({
          success: true,
          data: { zipCode: '27601', places: [] },
        }),
      ),
    );

    await expect(lookupZipCode('27601')).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });
});
