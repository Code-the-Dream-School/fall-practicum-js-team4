const request = require("supertest");

process.env.JWT_SECRET = "test-secret";

jest.mock("../src/config/prisma", () => {
  const crypto = require("crypto");
  const users = [];
  const reports = [];
  let reportIdCounter = 1;

  return {
    _users: users,
    _reports: reports,
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) return users.find((u) => u.id === where.id) || null;
        if (where.email) return users.find((u) => u.email === where.email) || null;
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const user = {
          id: crypto.randomUUID(),
          tokenVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        users.push(user);
        return user;
      }),
    },
    petReport: {
      create: jest.fn(async ({ data }) => {
        const currentReportId = reportIdCounter++;
        const report = {
          petReportId: currentReportId,
          userId: data.userId,
          reportType: data.reportType,
          petType: data.petType,
          petName: data.petName || null,
          breed: data.breed || null,
          color: data.color,
          size: data.size,
          gender: data.gender,
          distinctiveFeatures: data.distinctiveFeatures || null,
          eventDate: data.eventDate,
          contactInfo: data.contactInfo || null,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          location: data.location?.create
            ? { locationId: 1, petReportId: currentReportId, ...data.location.create }
            : null,
          photos: data.photos?.createMany?.data
            ? data.photos.createMany.data.map((p, i) => ({
                petPhotoId: i + 1,
                petReportId: currentReportId,
                imageUrl: p.imageUrl,
              }))
            : [],
        };
        reports.push(report);
        return report;
      }),
    },
  };
});

const app = require("../src/app");
const prisma = require("../src/config/prisma");

describe("POST /api/reports", () => {
  let agent;
  let testUser;

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
    photos: ["https://images.example.com/buddy.jpg"],
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
    expect(res.body.data.photos).toHaveLength(1);
    expect(res.body.data.photos[0]).toMatchObject({
      petPhotoId: expect.any(Number),
      petReportId: expect.any(Number),
      imageUrl: "https://images.example.com/buddy.jpg",
    });
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

  it("rejects non-https photo URLs (400)", async () => {
    const insecureReport = {
      ...validReport,
      photos: ["javascript:alert(1)"],
    };

    const res = await agent.post("/api/reports").send(insecureReport);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("VALIDATION_ERROR");
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
