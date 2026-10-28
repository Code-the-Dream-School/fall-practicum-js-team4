import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { MAX_REPORTS_PER_USER, getUserReports } from "../src/services/report.service";
import type { FakePrisma } from "./helpers/fakePrisma";
import type { Agent, ApiUser } from "./helpers/types";

// Report fields these tests read from API responses
interface ApiReport {
  petReportId: number;
  petName: string | null;
  userId: string;
}

process.env.JWT_SECRET = "test-secret";

// In-memory database (see test/helpers/fakePrisma.ts)
jest.mock("../src/config/prisma", () =>
  jest
    .requireActual<typeof import("./helpers/fakePrisma")>("./helpers/fakePrisma")
    .createFakePrisma(),
);
const prisma = jest.requireMock<FakePrisma>("../src/config/prisma");

describe("POST /api/reports", () => {
  let agent: Agent;
  let testUser: ApiUser;

  beforeEach(async () => {
    prisma._users.length = 0;
    prisma._reports.length = 0;
    jest.clearAllMocks();

    agent = request.agent(app);
    const regRes = await agent.post("/api/auth/register").send({
      name: "Alex Smith",
      email: "alex@example.com",
      password: "password123!",
    });
    testUser = regRes.body.data.user;
  });

  const validReport = {
    reportType: "LOST",
    petType: "DOG",
    petName: "Buddy",
    breed: "Golden Retriever",
    color: "Golden",
    size: "LARGE",
    gender: "MALE",
    distinctiveFeatures: "Blue collar with bell",
    eventDate: "2026-10-20T10:00:00.000Z",
    contactInfo: "+1234567890",
    location: {
      zipCode: "10001",
      city: "New York",
      state: "NY",
    },
  };

  it("creates a report successfully for an authenticated user (201)", async () => {
    const res = await agent.post("/api/reports").send(validReport);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      petReportId: expect.any(Number),
      userId: testUser.id,
      reportType: "LOST",
      petType: "DOG",
      petName: "Buddy",
      color: "Golden",
      status: "ACTIVE",
    });
    expect(res.body.data.location).toMatchObject({
      zipCode: "10001",
      city: "New York",
      state: "NY",
    });
    // A JSON request has no files, so nothing is uploaded or saved as a photo
    expect(prisma.petReport.create.mock.calls[0][0].data).not.toHaveProperty("photos");
  });

  it("supports FOUND reports without optional fields (201)", async () => {
    const minimalFoundReport = {
      reportType: "FOUND",
      petType: "CAT",
      color: "Black",
      size: "SMALL",
      gender: "UNKNOWN",
      eventDate: "2026-10-21T08:00:00.000Z",
    };

    const res = await agent.post("/api/reports").send(minimalFoundReport);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportType).toBe("FOUND");
    expect(res.body.data.petType).toBe("CAT");
  });

  it("rejects an event date in the future (400)", async () => {
    const futureReport = {
      ...validReport,
      eventDate: "2099-01-01T00:00:00.000Z",
    };

    const res = await agent.post("/api/reports").send(futureReport);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects photo URLs in JSON: photos must be uploaded as files (400)", async () => {
    const res = await agent
      .post("/api/reports")
      .send({ ...validReport, photos: ["https://images.example.com/buddy.jpg"] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details[0].field).toBe("photos");
    expect(prisma.petReport.create).not.toHaveBeenCalled();
  });

  it("rejects coordinates in location payload (400)", async () => {
    const reportWithCoordinates = {
      ...validReport,
      location: {
        ...validReport.location,
        latitude: 40.7128,
      },
    };

    const res = await agent.post("/api/reports").send(reportWithCoordinates);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unauthenticated requests (401)", async () => {
    const res = await request(app).post("/api/reports").send(validReport);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it.each([
    ["another user's id", { userId: "00000000-0000-0000-0000-000000000000" }],
    ["a status", { status: "REUNITED" }],
    ["a report id", { petReportId: 999 }],
    ["timestamps", { createdAt: "2020-01-01T00:00:00.000Z" }],
  ])("rejects a body that sets %s, which only the server decides (400)", async (_, extra) => {
    const res = await agent.post("/api/reports").send({ ...validReport, ...extra });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details[0].field).toBe(Object.keys(extra)[0]);
    expect(prisma.petReport.create).not.toHaveBeenCalled();
  });

  it("always saves the report under the signed-in user", async () => {
    await agent.post("/api/reports").send(validReport);

    expect(prisma.petReport.create.mock.calls[0][0].data.userId).toBe(testUser.id);
  });

  it("stores text exactly as sent; escaping it is the frontend's job", async () => {
    const petName = '<img src=x onerror="alert(1)">';

    const res = await agent.post("/api/reports").send({ ...validReport, petName });

    expect(res.status).toBe(201);
    expect(res.body.data.petName).toBe(petName);
  });

  describe("report limit", () => {
    const fillUp = (count: number) => {
      for (let i = 0; i < count; i++) {
        prisma._reports.push({ petReportId: 1000 + i, userId: testUser.id, createdAt: new Date() });
      }
    };

    it("allows the last report up to the limit", async () => {
      fillUp(MAX_REPORTS_PER_USER - 1);

      const res = await agent.post("/api/reports").send(validReport);

      expect(res.status).toBe(201);
    });

    it("returns 403 REPORT_LIMIT_REACHED once the user has the maximum", async () => {
      fillUp(MAX_REPORTS_PER_USER);

      const res = await agent.post("/api/reports").send(validReport);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        code: "REPORT_LIMIT_REACHED",
        message: `You can have at most ${MAX_REPORTS_PER_USER} reports.`,
      });
      expect(prisma.petReport.create).not.toHaveBeenCalled();
    });

    it("counts only the user's own reports", async () => {
      for (let i = 0; i < MAX_REPORTS_PER_USER; i++) {
        prisma._reports.push({ petReportId: 2000 + i, userId: "someone-else" });
      }

      const res = await agent.post("/api/reports").send(validReport);

      expect(res.status).toBe(201);
    });
  });

  it("rejects invalid input with validation details (400)", async () => {
    const invalidReport = {
      ...validReport,
      reportType: "INVALID_TYPE",
      size: "TINY",
    };

    const res = await agent.post("/api/reports").send(invalidReport);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details).toBeDefined();
  });
});

describe("GET /api/reports/mine", () => {
  let agent: Agent;
  let me: ApiUser;

  const signUp = async (email: string): Promise<{ agent: Agent; user: ApiUser }> => {
    const userAgent = request.agent(app);
    const res = await userAgent
      .post("/api/auth/register")
      .send({ name: "Test User", email, password: "password123!" });
    return { agent: userAgent, user: res.body.data.user };
  };

  const report = (overrides = {}) => ({
    reportType: "LOST",
    petType: "DOG",
    color: "Golden",
    size: "LARGE",
    gender: "MALE",
    eventDate: "2026-10-20T10:00:00.000Z",
    ...overrides,
  });

  const lastFindManyArgs = () => prisma.petReport.findMany.mock.calls.at(-1)![0];

  beforeEach(async () => {
    prisma._users.length = 0;
    prisma._reports.length = 0;
    jest.clearAllMocks();
    ({ agent, user: me } = await signUp("me@example.com"));
  });

  it("rejects unauthenticated requests (401)", async () => {
    const res = await request(app).get("/api/reports/mine");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
    expect(prisma.petReport.findMany).not.toHaveBeenCalled();
  });

  describe("a cookie claiming to be me", () => {
    // What an attacker could put in the token cookie to impersonate "me"
    const tokens = {
      "signed with a guessed secret": () => jwt.sign({ sub: me.id, ver: 0 }, "wrong-secret"),
      "unsigned (alg: none)": () => jwt.sign({ sub: me.id, ver: 0 }, null, { algorithm: "none" }),
      expired: () => jwt.sign({ sub: me.id, ver: 0, exp: 1 }, "test-secret"),
      "issued before a password change": () => {
        prisma._users.find((u) => u.id === me.id)!.tokenVersion = 1;
        return jwt.sign({ sub: me.id, ver: 0 }, "test-secret");
      },
      "garbage text": () => "not-a-jwt",
    };

    it.each(Object.keys(tokens) as (keyof typeof tokens)[])(
      "is rejected when %s (401)",
      async (name) => {
        await agent.post("/api/reports").send(report({ petName: "Secret" }));
        const token = tokens[name]();

        const res = await request(app).get("/api/reports/mine").set("Cookie", `token=${token}`);

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHENTICATED");
        expect(JSON.stringify(res.body)).not.toContain("Secret");
        expect(prisma.petReport.findMany).not.toHaveBeenCalled();
      },
    );
  });

  it("stops working after logout", async () => {
    await agent.post("/api/auth/logout");

    const res = await agent.get("/api/reports/mine");

    expect(res.status).toBe(401);
  });

  it("never shows another user's reports, even with my report ids known", async () => {
    await agent.post("/api/reports").send(report({ petName: "Mine" }));
    const other = await signUp("other@example.com");

    const res = await other.agent.get("/api/reports/mine");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 0, reports: [] });
    expect(lastFindManyArgs().where.userId).toBe(other.user.id);
  });

  it.each([
    ["the list", "/api/reports/mine"],
    ["the signed-in user", "/api/auth/me"],
  ])("tells caches never to store %s", async (_, path) => {
    const res = await agent.get(path);

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("returns an empty list when the user has no reports", async () => {
    const res = await agent.get("/api/reports/mine");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { total: 0, reports: [] } });
  });

  it("returns only the user's own reports, newest first, with location", async () => {
    const other = await signUp("other@example.com");
    await agent.post("/api/reports").send(
      report({
        petName: "Milo",
        location: { zipCode: "10001", city: "New York", state: "NY" },
      }),
    );
    await other.agent.post("/api/reports").send(report({ petName: "Not mine" }));
    await agent.post("/api/reports").send(report({ petName: "Luna", reportType: "FOUND" }));

    const res = await agent.get("/api/reports/mine");

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.reports.map((r: ApiReport) => r.petName)).toEqual(["Luna", "Milo"]);
    expect(res.body.data.reports.every((r: ApiReport) => r.userId === me.id)).toBe(true);
    expect(res.body.data.reports[1].location).toMatchObject({ city: "New York" });
  });

  it("asks the database for the user's reports with location and photos, newest first", async () => {
    await agent.get("/api/reports/mine");

    expect(lastFindManyArgs()).toEqual({
      where: { userId: me.id },
      include: {
        location: true,
        // publicId is left out on purpose: it's internal
        photos: {
          select: { petPhotoId: true, imageUrl: true, createdAt: true },
          orderBy: { petPhotoId: "asc" },
        },
      },
      orderBy: [{ createdAt: "desc" }, { petReportId: "desc" }],
    });
  });

  describe("search", () => {
    it("matches name, breed, color, features and city, ignoring case", async () => {
      await agent.get("/api/reports/mine").query({ search: "  Golden  " });

      const contains = { contains: "Golden", mode: "insensitive" };
      expect(lastFindManyArgs().where).toEqual({
        userId: me.id,
        OR: [
          { petName: contains },
          { breed: contains },
          { color: contains },
          { distinctiveFeatures: contains },
          { location: { is: { city: contains } } },
        ],
      });
    });

    it("treats %, _ and \\ as plain characters, not wildcards", async () => {
      await agent.get("/api/reports/mine").query({ search: "100%_\\" });

      expect(lastFindManyArgs().where.OR?.[0].petName.contains).toBe("100\\%\\_\\\\");
    });

    it.each([
      ["empty", ""],
      ["only spaces", "   "],
    ])("returns every report when the search is %s", async (_, search) => {
      await agent.get("/api/reports/mine").query({ search });

      expect(lastFindManyArgs().where).toEqual({ userId: me.id });
    });

    it.each([
      ["longer than 100 characters", "?search=" + "a".repeat(101)],
      ["given twice", "?search=a&search=b"],
      ["an unknown parameter", "?page=2"],
      ["someone else's user id", "?userId=00000000-0000-0000-0000-000000000000"],
      ["a Prisma filter object instead of text", "?search[mode]=default&search[contains]=a"],
    ])("rejects a query with %s (400)", async (_, query) => {
      const res = await agent.get(`/api/reports/mine${query}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(prisma.petReport.findMany).not.toHaveBeenCalled();
    });
  });
});

describe("PATCH /api/reports/:id", () => {
  let agent: Agent;
  let me: ApiUser;
  let myReportId: number;

  const signUp = async (email: string): Promise<{ agent: Agent; user: ApiUser }> => {
    const userAgent = request.agent(app);
    const res = await userAgent
      .post("/api/auth/register")
      .send({ name: "Test User", email, password: "password123!" });
    return { agent: userAgent, user: res.body.data.user };
  };

  const baseReport = {
    reportType: "LOST",
    petType: "DOG",
    petName: "Buddy",
    breed: "Golden Retriever",
    color: "Golden",
    size: "LARGE",
    gender: "MALE",
    distinctiveFeatures: "Blue collar with bell",
    eventDate: "2026-10-20T10:00:00.000Z",
    contactInfo: "+1234567890",
    location: {
      zipCode: "10001",
      city: "New York",
      state: "NY",
    },
  };

  beforeEach(async () => {
    prisma._users.length = 0;
    prisma._reports.length = 0;
    jest.clearAllMocks();

    ({ agent, user: me } = await signUp("me@example.com"));
    const created = await agent.post("/api/reports").send(baseReport);
    myReportId = (created.body.data as ApiReport).petReportId;
    jest.clearAllMocks();
  });

  it("rejects unauthenticated requests (401)", async () => {
    const res = await request(app).patch(`/api/reports/${myReportId}`).send({ petName: "Max" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  describe("a cookie claiming to be me", () => {
    const tokens = {
      "signed with a guessed secret": () => jwt.sign({ sub: me.id, ver: 0 }, "wrong-secret"),
      "unsigned (alg: none)": () => jwt.sign({ sub: me.id, ver: 0 }, null, { algorithm: "none" }),
      expired: () => jwt.sign({ sub: me.id, ver: 0, exp: 1 }, "test-secret"),
      "issued before a password change": () => {
        prisma._users.find((u) => u.id === me.id)!.tokenVersion = 1;
        return jwt.sign({ sub: me.id, ver: 0 }, "test-secret");
      },
      "garbage text": () => "not-a-jwt",
    };

    it.each(Object.keys(tokens) as (keyof typeof tokens)[])(
      "is rejected when %s (401)",
      async (name) => {
        const token = tokens[name]();

        const res = await request(app)
          .patch(`/api/reports/${myReportId}`)
          .set("Cookie", `token=${token}`)
          .send({ petName: "Hacked" });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHENTICATED");
        expect(prisma.petReport.update).not.toHaveBeenCalled();
      },
    );
  });

  it("stops working after logout (401)", async () => {
    await agent.post("/api/auth/logout");

    const res = await agent.patch(`/api/reports/${myReportId}`).send({ petName: "Max" });

    expect(res.status).toBe(401);
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN when trying to edit another user's report", async () => {
    const other = await signUp("other@example.com");

    const res = await other.agent
      .patch(`/api/reports/${myReportId}`)
      .send({ petName: "Stolen", status: "REUNITED" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      code: "FORBIDDEN",
      message: "You can only edit your own reports",
    });
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  it("returns 404 NOT_FOUND when the report does not exist", async () => {
    const res = await agent.patch("/api/reports/99999").send({ petName: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      code: "NOT_FOUND",
      message: "Report not found",
    });
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-5", "1.5", "9999999999"])(
    "rejects an invalid report id %s in the URL (400)",
    async (badId) => {
      const res = await agent.patch(`/api/reports/${badId}`).send({ petName: "Max" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe("id");
      expect(prisma.petReport.findUnique).not.toHaveBeenCalled();
    },
  );

  it("updates editable fields and returns the updated report (200)", async () => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send({
      petName: "Max",
      color: "Cream",
      size: "MEDIUM",
      status: "REUNITED",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      petReportId: myReportId,
      userId: me.id,
      petName: "Max",
      color: "Cream",
      size: "MEDIUM",
      status: "REUNITED",
      breed: "Golden Retriever",
    });
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("clears optional text fields to null when sent as empty strings or null", async () => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send({
      petName: "",
      breed: null,
      distinctiveFeatures: "   ",
      contactInfo: "",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      petName: null,
      breed: null,
      distinctiveFeatures: null,
      contactInfo: null,
    });
  });

  it("updates an existing location via upsert and clears stale coordinates (200)", async () => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send({
      location: { zipCode: "27701", city: "Durham", state: "nc" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.location).toMatchObject({
      zipCode: "27701",
      city: "Durham",
      state: "NC",
    });
    expect(prisma.petReport.update).toHaveBeenCalledWith({
      where: { petReportId: myReportId },
      data: {
        location: {
          upsert: {
            create: { zipCode: "27701", city: "Durham", state: "NC" },
            update: {
              zipCode: "27701",
              city: "Durham",
              state: "NC",
              latitude: null,
              longitude: null,
            },
          },
        },
      },
      include: { location: true },
    });
  });

  it("adds a location to a report that was created without one (200)", async () => {
    const createdWithoutLocation = await agent.post("/api/reports").send({
      reportType: "FOUND",
      petType: "CAT",
      color: "Black",
      size: "SMALL",
      gender: "UNKNOWN",
      eventDate: "2026-10-21T08:00:00.000Z",
    });
    const reportId = (createdWithoutLocation.body.data as ApiReport).petReportId;
    jest.clearAllMocks();

    const res = await agent.patch(`/api/reports/${reportId}`).send({
      location: { zipCode: "10001", city: "New York", state: "NY" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.location).toMatchObject({
      zipCode: "10001",
      city: "New York",
      state: "NY",
    });
  });

  it("removes the location when location is set to null (200)", async () => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send({
      location: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.location).toBeNull();
    expect(prisma.petReport.update).toHaveBeenCalledWith({
      where: { petReportId: myReportId },
      data: { location: { delete: true } },
      include: { location: true },
    });
  });

  it("does not issue a location delete when location is already null (200)", async () => {
    const createdWithoutLocation = await agent.post("/api/reports").send({
      reportType: "FOUND",
      petType: "CAT",
      color: "Black",
      size: "SMALL",
      gender: "UNKNOWN",
      eventDate: "2026-10-21T08:00:00.000Z",
    });
    const reportId = (createdWithoutLocation.body.data as ApiReport).petReportId;
    jest.clearAllMocks();

    const res = await agent.patch(`/api/reports/${reportId}`).send({
      location: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.location).toBeNull();
    expect(prisma.petReport.update).toHaveBeenCalledWith({
      where: { petReportId: reportId },
      data: {},
      include: { location: true },
    });
  });

  it("rejects an empty update body (400)", async () => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  it("rejects an event date in the future (400)", async () => {
    const res = await agent
      .patch(`/api/reports/${myReportId}`)
      .send({ eventDate: "2099-01-01T00:00:00.000Z" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  it.each([
    ["another user's id", { userId: "00000000-0000-0000-0000-000000000000" }],
    ["a report id", { petReportId: 999 }],
    ["createdAt", { createdAt: "2020-01-01T00:00:00.000Z" }],
    ["updatedAt", { updatedAt: "2020-01-01T00:00:00.000Z" }],
    ["photos", { photos: ["https://images.example.com/buddy.jpg"] }],
    [
      "coordinates in location",
      { location: { zipCode: "10001", city: "New York", state: "NY", latitude: 40.7 } },
    ],
  ])("rejects a body that attempts to set %s (400)", async (_, forbiddenField) => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send(forbiddenField);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });

  it.each([
    ["empty color", { color: "" }, "color"],
    ["null color", { color: null }, "color"],
    ["invalid petType", { petType: "FISH" }, "petType"],
    ["invalid status", { status: "DELETED" }, "status"],
    ["petName over 100 characters", { petName: "a".repeat(101) }, "petName"],
    ["incomplete location with only city", { location: { city: "X" } }, "location.zipCode"],
    ["empty location object", { location: {} }, "location.zipCode"],
    [
      "zip code that isn't 5 digits",
      { location: { zipCode: "1234", city: "New York", state: "NY" } },
      "location.zipCode",
    ],
  ])("rejects invalid field value: %s (400)", async (_, invalidPayload, expectedField) => {
    const res = await agent.patch(`/api/reports/${myReportId}`).send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details[0].field).toBe(expectedField);
    expect(prisma.petReport.update).not.toHaveBeenCalled();
  });
});

describe("reportService.getUserReports", () => {
  it("lists every report of the user when called without options", async () => {
    await getUserReports("user-1");

    expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });
});
