import request from "supertest";
import app from "../src/app";

// Rate limits are skipped when NODE_ENV is "test" (checked on every request);
// turn them on for this file only. Jest gives every test file its own module
// registry, so each file gets fresh limiters.
beforeAll(() => {
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

  // Runs last: it uses up the rest of the global limit for this file
  it("answers 429 TOO_MANY_REQUESTS once the global limit is used up", async () => {
    let res = await request(app).get("/api/hello");
    for (let i = 0; i < 100 && res.status !== 429; i++) {
      res = await request(app).get("/api/hello");
    }

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later",
    });
  });
});
