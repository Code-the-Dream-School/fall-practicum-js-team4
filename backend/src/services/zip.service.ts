export interface ZipPlace {
  city: string;
  state: string;
  stateCode: string;
  latitude: number;
  longitude: number;
}

export interface ZipLookupResult {
  zipCode: string;
  places: ZipPlace[];
}

export class ZipServiceUnavailableError extends Error {}

const serviceUnavailable = (message: string, cause?: unknown) => {
  console.error("Zip lookup failed:", message, cause ?? "");
  return new ZipServiceUnavailableError(message, { cause });
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 5000;
const cache = new Map<string, { data: ZipLookupResult | null; expires: number }>();

export const clearZipCache = () => cache.clear();

function getCached(zipCode: string) {
  const entry = cache.get(zipCode);
  if (!entry) return undefined;
  if (entry.expires <= Date.now()) {
    cache.delete(zipCode);
    return undefined;
  }
  return entry;
}

function setCached(zipCode: string, data: ZipLookupResult | null) {
  cache.delete(zipCode);
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(zipCode, { data, expires: Date.now() + CACHE_TTL_MS });
}

export async function lookupZip(zipCode: string): Promise<ZipLookupResult | null> {
  const cached = getCached(zipCode);
  if (cached) return cached.data;

  let res: Response;
  try {
    res = await fetch(`${process.env.ZIP_API_BASE_URL}/${zipCode}`, {
      signal: AbortSignal.timeout(Number(process.env.ZIP_API_TIMEOUT_MS) || 3000),
    });
  } catch (err) {
    throw serviceUnavailable("Zip lookup service unavailable", err);
  }

  if (res.status === 404) {
    setCached(zipCode, null);
    return null;
  }

  if (!res.ok) throw serviceUnavailable(`Zip API responded ${res.status}`);

  let places: ZipPlace[];
  try {
    const body = await res.json();
    // As we know successful response must contain a places array; anything else is a broken response
    if (!Array.isArray(body?.places)) throw new Error("Response has no places array");

    const seenCities = new Set<string>();
    places = body.places
      .map((p: Record<string, string>) => ({
        city: p["place name"],
        state: p.state,
        stateCode: p["state abbreviation"],
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
      }))
      .filter((p: ZipPlace) => {
        const key = p.city.toLowerCase();
        if (seenCities.has(key)) return false;
        seenCities.add(key);
        return true;
      });
  } catch (err) {
    throw serviceUnavailable("Zip API returned an invalid response", err);
  }
  const data = places.length ? { zipCode, places } : null;
  setCached(zipCode, data);
  return data;
}
