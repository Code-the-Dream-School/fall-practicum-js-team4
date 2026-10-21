const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export interface FieldError {
  field: string;
  message: string;
}

// Mirrors the backend error envelope (docs/auth.md). NETWORK_ERROR is
// frontend-only: the request never got a response.
export class ApiError extends Error {
  status: number;
  code: string;
  details: FieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: FieldError[] = [],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  success: false;
  code?: string;
  message?: string;
  details?: FieldError[];
}

export const apiRequest = async <T>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      // Sends the httpOnly session cookie
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and try again.',
    );
  }

  // A proxy or crashed server can answer with something that isn't our JSON
  const json = (await res.json().catch(() => null)) as
    { success: true; data: T } | ErrorBody | null;

  if (res.ok && json?.success) return json.data;

  const error = json && !json.success ? json : null;
  throw new ApiError(
    res.status,
    error?.code ?? 'INTERNAL_ERROR',
    error?.message ?? 'Something went wrong on our side. Please try again.',
    error?.details,
  );
};
