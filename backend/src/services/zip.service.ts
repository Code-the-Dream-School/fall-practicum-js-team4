export interface ZipPlace {
  city: string;
  state: string;
  sateCode: string;
  latitude: number;
  longitude: number;
}

export interface ZipLookupResult {
  zipCode: string;
  places: ZipPlace[];
}

export class ZipServiceUnavailableError extends Error {}

const CACH_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { data: ZipLookupResult | null; expires: number }>();

export const clearZipCach = () => cache.clear();

export async function lookupZip(zipCode: string): Promise<ZipLookupResult | null> {
  const cached = cache.get(zipCode);
  if (cached && cached.expires > Date.now()) return cached.data;
  let res: Response;
  try {
    res = await fetch(`${process.env.ZIP_API_BASE_URL}/${zipCode}`, {
      signal: AbortSignal.timeout(Number(process.env.ZIP_API_TIMEOUT_MS) || 3000),
    });
  } catch {
    throw new ZipServiceUnavailableError("Zip lookup service unavailable");
  }

  if (res.status === 404) {
    cache.set(zipCode, { data: null, expires: Date.now() + CACH_TTL_MS });
    return null;
  }

  if (!res.ok) throw new ZipServiceUnavailableError(`Zip API responded ${res.status}`);

  const body = await res.json();
  const cityPull = new Set<string>();
  const places: ZipPlace[] = (body.places ?? [])
    .map((p: Record<string, string>) => ({
      city: p["place name"],
      state: p.state,
      stateCode: p["state abbreviation"],
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
    }))
    .filter((p: ZipPlace) => {
      const key = p.city.toLowerCase();
      if (cityPull.has(key)) return false;
      cityPull.add(key);
      return true;
    });

  const data = places.length ? { zipCode, places } : null;
  cache.set(zipCode, { data, expires: Date.now() + CACH_TTL_MS });
  return data;
}
