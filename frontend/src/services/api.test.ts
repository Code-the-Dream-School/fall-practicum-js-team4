import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API, server } from '../test/server';
import { ApiError, apiRequest } from './api';

const catchError = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (err: unknown) => err as ApiError,
  );

describe('apiRequest', () => {
  it('returns data and sends JSON with the session cookie', async () => {
    // MSW doesn't expose `credentials`, so check what was passed to fetch
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    let sent: Request | undefined;
    server.use(
      http.post(`${API}/api/thing`, ({ request }) => {
        sent = request.clone();
        return HttpResponse.json({ success: true, data: { ok: 1 } });
      }),
    );

    const data = await apiRequest('/api/thing', {
      method: 'POST',
      body: { a: 1 },
    });

    expect(data).toEqual({ ok: 1 });
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
    expect(sent?.headers.get('content-type')).toBe('application/json');
    expect(await sent?.json()).toEqual({ a: 1 });
  });

  it('sends no Content-Type when there is no body', async () => {
    let contentType: string | null = 'unset';
    server.use(
      http.get(`${API}/api/thing`, ({ request }) => {
        contentType = request.headers.get('content-type');
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    await apiRequest('/api/thing');

    expect(contentType).toBeNull();
  });

  it('turns the error envelope into an ApiError', async () => {
    const details = [{ field: 'email', message: '"email" is required' }];
    server.use(
      http.post(`${API}/api/thing`, () =>
        HttpResponse.json(
          {
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details,
          },
          { status: 400 },
        ),
      ),
    );

    const err = await catchError(apiRequest('/api/thing', { method: 'POST' }));

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details,
    });
  });

  it('reports a response that is not JSON as INTERNAL_ERROR', async () => {
    server.use(
      http.get(
        `${API}/api/thing`,
        () => new HttpResponse('Bad Gateway', { status: 502 }),
      ),
    );

    const err = await catchError(apiRequest('/api/thing'));

    expect(err).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
  });

  it('reports an unreachable server as NETWORK_ERROR', async () => {
    server.use(http.get(`${API}/api/thing`, () => HttpResponse.error()));

    const err = await catchError(apiRequest('/api/thing'));

    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(err.message).toMatch(/could not reach the server/i);
  });
});
