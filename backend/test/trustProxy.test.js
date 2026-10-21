const request = require("supertest");
const { parseTrustProxy } = require("../src/config/trustProxy");

describe("parseTrustProxy", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["1", 1],
    [" 2 ", 2],
    ["loopback", "loopback"],
    ["10.0.0.0/8", "10.0.0.0/8"],
  ])("TRUST_PROXY=%j → %j", (value, expected) => {
    expect(parseTrustProxy(value)).toBe(expected);
  });

  it("refuses TRUST_PROXY=true, which would let clients fake their IP", () => {
    expect(() => parseTrustProxy("true")).toThrow("unsafe");
  });
});

describe("rate limiting behind a proxy", () => {
  // Fresh app per scenario, with rate limiting on (it's skipped when NODE_ENV is "test")
  const loadApp = (trustProxy) => {
    let app;
    process.env.TRUST_PROXY = trustProxy;
    jest.isolateModules(() => {
      app = require("../src/app");
    });
    return app;
  };

  beforeAll(() => {
    process.env.NODE_ENV = "development";
  });
  afterAll(() => {
    process.env.NODE_ENV = "test";
    delete process.env.TRUST_PROXY;
  });

  // Uses up the 20 auth attempts for one client IP (as forwarded by the proxy)
  const exhaust = async (app, ip) => {
    for (let i = 0; i < 20; i++) {
      await request(app).post("/api/auth/login").set("X-Forwarded-For", ip).send({});
    }
  };
  const attempt = (app, ip) =>
    request(app).post("/api/auth/login").set("X-Forwarded-For", ip).send({});

  it("with TRUST_PROXY=1, limits each client separately", async () => {
    const app = loadApp("1");
    await exhaust(app, "203.0.113.1");

    expect((await attempt(app, "203.0.113.1")).status).toBe(429);
    // A different user behind the same proxy isn't affected
    expect((await attempt(app, "203.0.113.2")).status).toBe(400);
  });

  it("without TRUST_PROXY, ignores X-Forwarded-For so clients can't dodge the limit", async () => {
    const app = loadApp("");
    await exhaust(app, "203.0.113.1");

    expect((await attempt(app, "203.0.113.2")).status).toBe(429);
  });
});
