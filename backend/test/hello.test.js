const request = require("supertest");
const app = require("../src/app");

describe("GET /api/hello", () => {
  it("returns a greeting", async () => {
    const res = await request(app).get("/api/hello");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Hello World" });
  });
});
