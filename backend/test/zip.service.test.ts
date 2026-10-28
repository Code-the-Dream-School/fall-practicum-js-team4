import {
  lookupZip,
  clearZipCache,
  CACHE_MAX_ENTRIES,
  ZipServiceUnavailableError,
} from "../src/services/zip.service";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

const beverlyHills = {
  "place name": "Beverly Hills",
  state: "California",
  "state abbreviation": "CA",
  latitude: "34.0901",
  longitude: "-118.4065",
};

beforeEach(() => {
  process.env.ZIP_API_BASE_URL = "https://api.test/us";
  clearZipCache();
  mockFetch.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("lookupZip", () => {
  it("maps API response and removes duplicate cities", async () => {
    mockFetch.mockResolvedValue(okResponse({ places: [beverlyHills, beverlyHills] }));

    const result = await lookupZip("90210");

    expect(result).toEqual({
      zipCode: "90210",
      places: [{ city: "Beverly Hills", state: "California", stateCode: "CA", latitude: 34.0901, longitude: -118.4065 }],
    });
  });

  it("returns all distinct cities when zip has several places", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ places: [beverlyHills, { ...beverlyHills, "place name": "West Hollywood" }] }),
    );

    const result = await lookupZip("90210");

    expect(result?.places.map((p) => p.city)).toEqual(["Beverly Hills", "West Hollywood"]);
  });

  it("returns null when zip does not exist", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    expect(await lookupZip("00000")).toBeNull();
  });

  it("throws ZipServiceUnavailableError on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    await expect(lookupZip("90210")).rejects.toBeInstanceOf(ZipServiceUnavailableError);
  });

  it("throws ZipServiceUnavailableError when API responds with an error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(lookupZip("90210")).rejects.toBeInstanceOf(ZipServiceUnavailableError);
  });

  it("does not cache API errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(lookupZip("90210")).rejects.toBeInstanceOf(ZipServiceUnavailableError);

    mockFetch.mockResolvedValueOnce(okResponse({ places: [beverlyHills] }));
    expect(await lookupZip("90210")).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses cache for repeated lookups", async () => {
    mockFetch.mockResolvedValue(okResponse({ places: [beverlyHills] }));
    await lookupZip("90210");
    await lookupZip("90210");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches again after the cache entry expires", async () => {
    mockFetch.mockResolvedValue(okResponse({ places: [beverlyHills] }));
    const now = Date.now();
    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    await lookupZip("90210");
    dateSpy.mockReturnValue(now + 25 * 60 * 60 * 1000); // 25 hours later
    await lookupZip("90210");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("evicts the oldest entry when the cache is full", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    for (let i = 0; i < CACHE_MAX_ENTRIES; i++) {
      await lookupZip(String(i).padStart(5, "0"));
    }
    await lookupZip("99999"); // overflow: "00000" should be evicted
    mockFetch.mockClear();

    await lookupZip("00000");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});