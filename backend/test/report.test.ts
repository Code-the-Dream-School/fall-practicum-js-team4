import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { MAX_REPORTS_PER_USER, getUserReports, listReports } from "../src/services/report.service";
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

  // What every report response includes: location, and photos without the
  // internal Cloudinary publicId
  const REPORT_INCLUDE = {
    location: true,
    photos: {
      select: { petPhotoId: true, imageUrl: true, createdAt: true },
      orderBy: { petPhotoId: "asc" },
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

  it("returns the report's photos, like create and GET /mine, without publicId (200)", async () => {
    const stored = prisma._reports.find((r) => r.petReportId === myReportId)!;
    stored.photos = [
      {
        petPhotoId: 7,
        petReportId: myReportId,
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/buddy.webp",
        publicId: "pawradar/reports/buddy",
        createdAt: new Date(),
      },
    ];

    const res = await agent.patch(`/api/reports/${myReportId}`).send({ petName: "Max" });

    expect(res.status).toBe(200);
    expect(res.body.data.petName).toBe("Max");
    expect(res.body.data.photos).toEqual([
      {
        petPhotoId: 7,
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/buddy.webp",
        createdAt: expect.any(String),
      },
    ]);
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
      include: REPORT_INCLUDE,
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
      include: REPORT_INCLUDE,
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
      include: REPORT_INCLUDE,
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

describe("GET /api/reports", () => {
  const signUp = async (email: string): Promise<{ agent: Agent; user: ApiUser }> => {
    const userAgent = request.agent(app);
    const res = await userAgent
      .post("/api/auth/register")
      .send({ name: "Test User", email, password: "password123!" });
    return { agent: userAgent, user: res.body.data.user };
  };

  const sampleReport = (overrides = {}) => ({
    reportType: "LOST",
    petType: "DOG",
    petName: "Buddy",
    breed: "Golden Retriever",
    color: "Golden",
    size: "LARGE",
    gender: "MALE",
    distinctiveFeatures: "Blue collar with bell",
    eventDate: "2026-10-20T10:00:00.000Z",
    contactInfo: "owner-secret@example.com",
    location: {
      zipCode: "10001",
      city: "New York",
      state: "NY",
    },
    ...overrides,
  });

  beforeEach(() => {
    prisma._users.length = 0;
    prisma._reports.length = 0;
    jest.clearAllMocks();
  });

  it("allows anonymous access and returns an empty list when the database is empty (200)", async () => {
    const res = await request(app).get("/api/reports");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        reports: [],
      },
    });
  });

  it("filters out sensitive information (userId, contactInfo, exact coordinates, photo publicId) while keeping consistent summary shape", async () => {
    const { agent } = await signUp("owner@example.com");
    const created = await agent.post("/api/reports").send(sampleReport());
    const reportId = (created.body.data as ApiReport).petReportId;

    // Simulate stored coordinates and photo publicId in the database
    const stored = prisma._reports.find((r) => r.petReportId === reportId)!;
    stored.location = {
      ...stored.location,
      latitude: "40.7128000",
      longitude: "-74.0060000",
    };
    stored.photos = [
      {
        petPhotoId: 10,
        petReportId: reportId,
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/buddy.webp",
        publicId: "pawradar/reports/buddy-secret-id",
        createdAt: new Date("2026-10-20T12:00:00.000Z"),
      },
    ];

    // Anonymous request (no cookies)
    const res = await request(app).get("/api/reports");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);

    const item = res.body.data.reports[0];
    expect(item).toMatchObject({
      petReportId: reportId,
      reportType: "LOST",
      petType: "DOG",
      petName: "Buddy",
      breed: "Golden Retriever",
      color: "Golden",
      size: "LARGE",
      gender: "MALE",
      distinctiveFeatures: "Blue collar with bell",
      status: "ACTIVE",
      location: {
        locationId: 1,
        petReportId: reportId,
        zipCode: "10001",
        city: "New York",
        state: "NY",
      },
      photos: [
        {
          petPhotoId: 10,
          imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/buddy.webp",
          createdAt: "2026-10-20T12:00:00.000Z",
        },
      ],
    });

    // Sensitive fields must never be exposed in public summaries
    expect(item).not.toHaveProperty("userId");
    expect(item).not.toHaveProperty("contactInfo");
    expect(item.location).not.toHaveProperty("latitude");
    expect(item.location).not.toHaveProperty("longitude");
    expect(item.photos[0]).not.toHaveProperty("publicId");
  });

  it("orders reports newest first (createdAt desc, petReportId desc)", async () => {
    const { agent: agent1 } = await signUp("user1@example.com");
    const { agent: agent2 } = await signUp("user2@example.com");

    await agent1.post("/api/reports").send(sampleReport({ petName: "Oldest" }));
    await agent2.post("/api/reports").send(sampleReport({ petName: "Middle" }));
    await agent1.post("/api/reports").send(sampleReport({ petName: "Newest" }));

    // Force identical timestamps on Middle and Newest to verify petReportId tie-breaker
    const sameTime = new Date("2026-10-25T15:00:00.000Z");
    prisma._reports[0].createdAt = new Date("2026-10-24T10:00:00.000Z");
    prisma._reports[1].createdAt = sameTime;
    prisma._reports[2].createdAt = sameTime;

    const res = await request(app).get("/api/reports");

    expect(res.status).toBe(200);
    expect(res.body.data.reports.map((r: { petName: string }) => r.petName)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
    expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { petReportId: "desc" }],
        skip: 0,
        take: 20,
      }),
    );
  });

  describe("filtering by type and status", () => {
    beforeEach(async () => {
      const { agent } = await signUp("filter@example.com");
      await agent
        .post("/api/reports")
        .send(sampleReport({ petName: "Lost Dog 1", reportType: "LOST" }));
      await agent
        .post("/api/reports")
        .send(sampleReport({ petName: "Lost Dog 2", reportType: "LOST" }));
      await agent
        .post("/api/reports")
        .send(sampleReport({ petName: "Found Cat 1", reportType: "FOUND", petType: "CAT" }));
      const reunitedRes = await agent
        .post("/api/reports")
        .send(sampleReport({ petName: "Reunited Dog", reportType: "LOST" }));
      await agent
        .patch(`/api/reports/${reunitedRes.body.data.petReportId}`)
        .send({ status: "REUNITED" });
      jest.clearAllMocks();
    });

    it("defaults to status=ACTIVE and returns both LOST and FOUND when type is omitted (200)", async () => {
      const res = await request(app).get("/api/reports");

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.totalPages).toBe(1);
      expect(res.body.data.reports.map((r: { petName: string }) => r.petName)).toEqual([
        "Found Cat 1",
        "Lost Dog 2",
        "Lost Dog 1",
      ]);
      expect(prisma.petReport.count).toHaveBeenLastCalledWith({
        where: { status: "ACTIVE" },
      });
      expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE" },
        }),
      );
    });

    it("filters by type=LOST and applies the same where to count and findMany (200)", async () => {
      const res = await request(app).get("/api/reports").query({ type: "LOST", limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        total: 2,
        page: 1,
        limit: 1,
        totalPages: 2,
      });
      expect(res.body.data.reports.map((r: { petName: string }) => r.petName)).toEqual([
        "Lost Dog 2",
      ]);
      expect(prisma.petReport.count).toHaveBeenLastCalledWith({
        where: { status: "ACTIVE", reportType: "LOST" },
      });
      expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE", reportType: "LOST" },
        }),
      );
    });

    it("filters by type=FOUND and status=REUNITED (200)", async () => {
      const foundRes = await request(app).get("/api/reports").query({ type: "FOUND" });
      expect(foundRes.status).toBe(200);
      expect(foundRes.body.data.total).toBe(1);
      expect(foundRes.body.data.reports.map((r: { petName: string }) => r.petName)).toEqual([
        "Found Cat 1",
      ]);

      const reunitedRes = await request(app)
        .get("/api/reports")
        .query({ type: "LOST", status: "REUNITED" });
      expect(reunitedRes.status).toBe(200);
      expect(reunitedRes.body.data.total).toBe(1);
      expect(reunitedRes.body.data.reports.map((r: { petName: string }) => r.petName)).toEqual([
        "Reunited Dog",
      ]);
      expect(prisma.petReport.count).toHaveBeenLastCalledWith({
        where: { status: "REUNITED", reportType: "LOST" },
      });
      expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { status: "REUNITED", reportType: "LOST" },
        }),
      );
    });
  });

  describe("search, attribute filters and sort", () => {
    const names = (res: request.Response) =>
      res.body.data.reports.map((r: { petName: string }) => r.petName);

    beforeEach(async () => {
      const { agent } = await signUp("search@example.com");
      await agent
        .post("/api/reports")
        .send(sampleReport({ petName: "Milo", breed: "Golden Retriever", size: "LARGE" }));
      await agent.post("/api/reports").send(
        sampleReport({
          petName: "Luna",
          petType: "CAT",
          breed: "Siamese",
          color: "Cream",
          size: "SMALL",
          gender: "FEMALE",
          distinctiveFeatures: "100% shy, white paws",
          location: { zipCode: "11201", city: "Brooklyn", state: "NY" },
        }),
      );
      await agent.post("/api/reports").send(
        sampleReport({
          petName: "Rex",
          breed: "German Shepherd",
          color: "Black",
          size: "MEDIUM",
          distinctiveFeatures: null,
        }),
      );
      jest.clearAllMocks();
    });

    it("matches name, breed, color, features and city, ignoring case and spaces", async () => {
      const res = await request(app).get("/api/reports").query({ search: "  SIAM  " });

      expect(res.status).toBe(200);
      expect(names(res)).toEqual(["Luna"]);
      const contains = { contains: "SIAM", mode: "insensitive" };
      expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            status: "ACTIVE",
            OR: [
              { petName: contains },
              { breed: contains },
              { color: contains },
              { distinctiveFeatures: contains },
              { location: { is: { city: contains } } },
            ],
          },
        }),
      );
    });

    it.each([
      ["the city", "brooklyn", ["Luna"]],
      ["the color", "golden", ["Milo"]],
      ["distinctive features", "white paws", ["Luna"]],
      ["nothing", "parrot", []],
    ])("finds reports by %s", async (_, search, expected) => {
      const res = await request(app).get("/api/reports").query({ search });

      expect(names(res)).toEqual(expected);
      expect(res.body.data.total).toBe(expected.length);
    });

    it.each([
      ["dog", ["Rex", "Milo"]],
      ["DOGS", ["Rex", "Milo"]],
      ["Cat", ["Luna"]],
      ["birds", []],
    ])("finds every pet of a type by the word %s, in any case", async (search, expected) => {
      const res = await request(app).get("/api/reports").query({ search });

      expect(names(res)).toEqual(expected);
    });

    it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
      "treats %s as plain text, not as a pet type word",
      async (search) => {
        const res = await request(app).get("/api/reports").query({ search });

        expect(res.status).toBe(200);
        expect(names(res)).toEqual([]);
        const or = prisma.petReport.findMany.mock.calls.at(-1)![0].where.OR!;
        expect(or.some((condition) => "petType" in condition)).toBe(false);
      },
    );

    it("matches the pet type only for the whole word", async () => {
      await request(app).get("/api/reports").query({ search: "do" });

      const or = prisma.petReport.findMany.mock.calls.at(-1)![0].where.OR;
      expect(or).not.toContainEqual({ petType: "DOG" });
    });

    it("treats % and _ as plain characters, not wildcards", async () => {
      const res = await request(app).get("/api/reports").query({ search: "100%" });

      expect(names(res)).toEqual(["Luna"]);
      expect(prisma.petReport.findMany.mock.calls.at(-1)![0].where.OR![0].petName.contains).toBe(
        "100\\%",
      );
    });

    it("returns every report when the search is empty", async () => {
      const res = await request(app).get("/api/reports").query({ search: "   " });

      expect(res.body.data.total).toBe(3);
      expect(prisma.petReport.count).toHaveBeenLastCalledWith({ where: { status: "ACTIVE" } });
    });

    it("filters by pet type, size and gender, combined with search and type", async () => {
      const res = await request(app)
        .get("/api/reports")
        .query({ type: "LOST", petType: "DOG", size: "MEDIUM", gender: "MALE", search: "shep" });

      expect(names(res)).toEqual(["Rex"]);
      expect(prisma.petReport.count).toHaveBeenLastCalledWith({
        where: expect.objectContaining({
          status: "ACTIVE",
          reportType: "LOST",
          petType: "DOG",
          size: "MEDIUM",
          gender: "MALE",
        }),
      });
    });

    it("sorts newest first by default and oldest first on request", async () => {
      const newest = await request(app).get("/api/reports");
      const oldest = await request(app).get("/api/reports").query({ sort: "oldest" });

      expect(names(newest)).toEqual(["Rex", "Luna", "Milo"]);
      expect(names(oldest)).toEqual(["Milo", "Luna", "Rex"]);
      expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: "asc" }, { petReportId: "asc" }],
        }),
      );
    });

    it.each([
      ["a search longer than 100 characters", "?search=" + "a".repeat(101)],
      ["a search given twice", "?search=a&search=b"],
      ["a Prisma filter object instead of text", "?search[contains]=a"],
      ["an unknown pet type", "?petType=DRAGON"],
      ["an unknown size", "?size=HUGE"],
      ["an unknown gender", "?gender=OTHER"],
      ["an unknown sort", "?sort=name"],
      ["lowercase enum values", "?petType=dog"],
    ])("rejects %s (400)", async (_, query) => {
      const res = await request(app).get(`/api/reports${query}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(prisma.petReport.findMany).not.toHaveBeenCalled();
    });
  });

  describe("pagination", () => {
    beforeEach(async () => {
      const { agent } = await signUp("pager@example.com");
      for (let i = 1; i <= 5; i++) {
        await agent.post("/api/reports").send(sampleReport({ petName: `Pet ${i}` }));
      }
    });

    it("returns the requested page slice and pagination metadata (200)", async () => {
      const res = await request(app).get("/api/reports").query({ page: 2, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        total: 5,
        page: 2,
        limit: 2,
        totalPages: 3,
      });
      // Reports newest first: Pet 5, Pet 4 (page 1), Pet 3, Pet 2 (page 2), Pet 1 (page 3)
      expect(res.body.data.reports.map((r: { petName: string }) => r.petName)).toEqual([
        "Pet 3",
        "Pet 2",
      ]);
      expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 2, take: 2 }),
      );
    });

    it("returns an empty reports array when page is beyond totalPages (200)", async () => {
      const res = await request(app).get("/api/reports").query({ page: 10, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        total: 5,
        page: 10,
        limit: 2,
        totalPages: 3,
        reports: [],
      });
    });

    it.each([
      ["page is 0", "?page=0", "page"],
      ["page is negative", "?page=-2", "page"],
      ["page is not an integer", "?page=1.5", "page"],
      ["page is non-numeric", "?page=abc", "page"],
      ["limit is 0", "?limit=0", "limit"],
      ["limit is negative", "?limit=-5", "limit"],
      ["limit exceeds 100", "?limit=101", "limit"],
      ["limit is non-numeric", "?limit=xyz", "limit"],
      ["type is invalid", "?type=ADOPTED", "type"],
      ["status is invalid", "?status=CLOSED", "status"],
      ["an unknown query parameter is sent", "?userId=123", "userId"],
    ])("rejects invalid pagination query when %s (400)", async (_, query, expectedField) => {
      const res = await request(app).get(`/api/reports${query}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe(expectedField);
      expect(prisma.petReport.findMany).not.toHaveBeenCalled();
    });
  });

  it("handles unexpected database errors with a 500 INTERNAL_ERROR response", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    prisma.petReport.findMany.mockRejectedValueOnce(new Error("Database connection lost"));

    const res = await request(app).get("/api/reports");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
    consoleSpy.mockRestore();
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

describe("reportService.listReports", () => {
  it("uses default page=1, limit=20, and status=ACTIVE when called without arguments", async () => {
    prisma._reports.length = 0;
    const result = await listReports();

    expect(result).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      reports: [],
    });
    expect(prisma.petReport.count).toHaveBeenLastCalledWith({
      where: { status: "ACTIVE" },
    });
    expect(prisma.petReport.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
        skip: 0,
        take: 20,
      }),
    );
  });
});
