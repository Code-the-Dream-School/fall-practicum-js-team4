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

  it("serves the Swagger UI page", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});
