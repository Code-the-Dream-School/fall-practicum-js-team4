const request = require("supertest");
const app = require("../src/app");
const authRoutes = require("../src/routes/auth.routes");

describe("API docs", () => {
  it("serves the OpenAPI spec as JSON", async () => {
    const res = await request(app).get("/api/docs/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
  });

  it("documents every auth route", async () => {
    const { body: spec } = await request(app).get("/api/docs/openapi.json");
    const routes = authRoutes.stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods).map((method) => `${method} /api/auth${layer.route.path}`),
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
