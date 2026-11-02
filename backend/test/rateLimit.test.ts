import type { Express } from "express";
import request from "supertest";
import app from "../src/app";

process.env.JWT_SECRET = "test-secret";

// In-memory database, for the report tests that need a signed-in user
jest.mock("../src/config/prisma", () =>
  jest
    .requireActual<typeof import("./helpers/fakePrisma")>("./helpers/fakePrisma")
    .createFakePrisma(),
);

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

describe("report creation limit", () => {
  // A fresh app with fresh limiters: the tests above used up this file's IP limits
  let freshApp: Express;
  beforeAll(() => {
    jest.isolateModules(() => {
      freshApp = jest.requireActual<typeof import("../src/app")>("../src/app").default;
    });
  });

  const signedInAs = async (email: string) => {
    const agent = request.agent(freshApp);
    await agent
      .post("/api/auth/register")
      .send({ name: "Test User", email, password: "correct-horse-1" });
    return agent;
  };

  it("allows 20 reports per user per 15 minutes, then answers 429", async () => {
    const alice = await signedInAs("alice@example.com");
    // An empty body fails validation, which is enough: every attempt counts
    for (let i = 0; i < 20; i++) {
      expect((await alice.post("/api/reports").send({})).status).toBe(400);
    }

    const res = await alice.post("/api/reports").send({});
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many reports, please try again later",
    });
  });

  it("counts per user, so others on the same network aren't blocked", async () => {
    const bob = await signedInAs("bob@example.com");

    expect((await bob.post("/api/reports").send({})).status).toBe(400);
  });
});
