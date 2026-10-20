const request = require("supertest");

// Rate limits are skipped when NODE_ENV is "test"; turn them on for this file only
// (Jest gives every test file its own module registry, so each gets fresh limiters)
let app;
beforeAll(() => {
  app = require("../src/app");
  process.env.NODE_ENV = "development";
});
afterAll(() => {
  process.env.NODE_ENV = "test";
});

describe("rate limiting", () => {
  it("allows 20 auth attempts per IP, then answers 429 TOO_MANY_REQUESTS", async () => {
    // An empty body fails validation, which is enough: every attempt counts
    for (let i = 0; i < 20; i++) {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
    }

    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts, please try again later",
    });
  });

  it("applies a global limit of 100 requests and reports it in headers", async () => {
    const res = await request(app).get("/api/hello");
    expect(res.headers["x-ratelimit-limit"]).toBe("100");
    expect(Number(res.headers["x-ratelimit-remaining"])).toBeLessThan(100);
  });
});
