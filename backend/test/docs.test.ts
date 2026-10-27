import request from "supertest";
import app from "../src/app";
import authRoutes from "../src/routes/auth.routes";
import reportRoutes from "../src/routes/report.routes";

// Only the parts of Express's router and of the OpenAPI spec these tests read
interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}
interface Spec {
  paths: Record<string, Record<string, { responses: Record<string, { $ref?: string }> }>>;
}

const getSpec = async (): Promise<Spec> => (await request(app).get("/api/docs/openapi.json")).body;

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
    const spec = await getSpec();
    const routes = (router.stack as RouteLayer[]).flatMap(({ route }) =>
      route
        ? Object.keys(route.methods).map((method) => {
            // "/" is documented as the prefix itself, e.g. /api/reports
            const path = route.path === "/" ? prefix : `${prefix}${route.path}`;
            return `${method} ${path}`;
          })
        : [],
    );

    for (const route of routes) {
      const [method, path] = route.split(" ");
      expect(spec.paths[path]?.[method]).toBeDefined();
    }
  });

  // The global rate limit applies to every route, so every operation can answer 429
  it("documents the 429 rate-limit response on every operation", async () => {
    const spec = await getSpec();
    const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(
        ([method, op]) => [`${method.toUpperCase()} ${path}`, op] as const,
      ),
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
