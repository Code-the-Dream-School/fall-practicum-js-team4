const request = require("supertest");
const app = require("../src/app");
const authRoutes = require("../src/routes/auth.routes");
const reportRoutes = require("../src/routes/report.routes");

describe("API docs", () => {
  it("serves the OpenAPI spec as JSON", async () => {
    const res = await request(app).get("/api/docs/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
  });

  it.each([
    ["/api/auth", authRoutes],
    ["/api/reports", reportRoutes],
  ])("documents every %s route", async (prefix, router) => {
    const { body: spec } = await request(app).get("/api/docs/openapi.json");
    const routes = router.stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods).map((method) => {
          // "/" is documented as the prefix itself, e.g. /api/reports
          const path = layer.route.path === "/" ? prefix : `${prefix}${layer.route.path}`;
          return `${method} ${path}`;
        }),
      );

    for (const route of routes) {
      const [method, path] = route.split(" ");
      expect(spec.paths[path]?.[method]).toBeDefined();
    }
  });

  // The global rate limit applies to every route, so every operation can answer 429
  it("documents the 429 rate-limit response on every operation", async () => {
    const { body: spec } = await request(app).get("/api/docs/openapi.json");
    const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, op]) => [`${method.toUpperCase()} ${path}`, op]),
    );

    expect(operations.length).toBeGreaterThan(0);
    for (const [name, op] of operations) {
      expect([name, op.responses["429"]?.$ref]).toEqual([
        name,
        "#/components/responses/TooManyRequests",
      ]);
    }
  });

  it("serves the Swagger UI page", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});
