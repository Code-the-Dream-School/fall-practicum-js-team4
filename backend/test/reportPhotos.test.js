const request = require("supertest");
const sharp = require("sharp");

process.env.JWT_SECRET = "test-secret";
process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "key";
process.env.CLOUDINARY_API_SECRET = "secret";

// Fake Cloudinary: records each upload and answers like the real SDK
jest.mock("cloudinary", () => {
  const uploads = [];
  const succeed = (options, callback) => ({
    end: (buffer) => {
      const n = uploads.push({ options, buffer });
      setImmediate(() =>
        callback(null, {
          secure_url: `https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/photo${n}.webp`,
          public_id: `pawradar/reports/photo${n}`,
        }),
      );
    },
  });
  return {
    v2: {
      _uploads: uploads,
      _succeed: succeed,
      config: jest.fn(),
      uploader: { upload_stream: jest.fn(succeed) },
      api: { delete_resources: jest.fn(async () => ({})) },
    },
  };
});

// In-memory stand-in for the users and pet_reports tables
jest.mock("../src/config/prisma", () => {
  const crypto = require("crypto");
  const users = [];
  const reports = [];
  let nextReportId = 1;
  let nextPhotoId = 1;
  const pick = (obj, select) =>
    Object.fromEntries(Object.keys(select).map((key) => [key, obj[key]]));

  return {
    _users: users,
    _reports: reports,
    user: {
      findUnique: jest.fn(
        async ({ where }) =>
          users.find((u) => (where.id ? u.id === where.id : u.email === where.email)) || null,
      ),
      create: jest.fn(async ({ data }) => {
        const user = { id: crypto.randomUUID(), tokenVersion: 0, createdAt: new Date(), ...data };
        users.push(user);
        return user;
      }),
    },
    petReport: {
      count: jest.fn(async ({ where }) => reports.filter((r) => r.userId === where.userId).length),
      create: jest.fn(async ({ data, include }) => {
        const petReportId = nextReportId++;
        const { location, photos, ...fields } = data;
        const report = {
          petReportId,
          status: "ACTIVE",
          createdAt: new Date(),
          ...fields,
          location: location ? { petReportId, ...location.create } : null,
          photos: (photos?.createMany.data ?? []).map((photo) => ({
            petPhotoId: nextPhotoId++,
            petReportId,
            createdAt: new Date(),
            ...photo,
          })),
        };
        reports.push(report);
        // Apply the photo `select` like Prisma does
        return { ...report, photos: report.photos.map((p) => pick(p, include.photos.select)) };
      }),
      findMany: jest.fn(async ({ where, include }) =>
        reports
          .filter((r) => r.userId === where.userId)
          .map((r) => ({ ...r, photos: r.photos.map((p) => pick(p, include.photos.select)) })),
      ),
    },
  };
});

const app = require("../src/app");
const prisma = require("../src/config/prisma");
const { v2: cloudinary } = require("cloudinary");
const { MAX_REPORTS_PER_USER } = require("../src/services/report.service");

const report = {
  reportType: "LOST",
  petType: "DOG",
  petName: "Milo",
  color: "Golden",
  size: "LARGE",
  gender: "MALE",
  eventDate: "2026-10-20T10:00:00.000Z",
  location: { zipCode: "10036", city: "New York", state: "NY" },
};

// Test photos made on the fly
const solid = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: "#c96" } });
const jpegWithGps = () =>
  solid(2400, 1200)
    .jpeg()
    .withExif({
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "40/1 45/1 29/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "73/1 59/1 8/1",
      },
    })
    .toBuffer();
const png = () => solid(300, 200).png().toBuffer();

describe("POST /api/reports with photos", () => {
  let agent;

  // A multipart request: the report as JSON text plus photo files
  const send = (photos = [], body = JSON.stringify(report), client = agent) => {
    const req = client.post("/api/reports").field("report", body);
    photos.forEach((buffer, i) => req.attach("photos", buffer, `photo${i}.jpg`));
    return req;
  };

  beforeEach(async () => {
    prisma._users.length = 0;
    prisma._reports.length = 0;
    cloudinary._uploads.length = 0;
    jest.clearAllMocks();
    cloudinary.uploader.upload_stream.mockImplementation(cloudinary._succeed);
    agent = request.agent(app);
    await agent
      .post("/api/auth/register")
      .send({ name: "Sam", email: "sam@example.com", password: "correct-horse-1" });
  });

  it("uploads the photos and saves them with the report (201)", async () => {
    const res = await send([await jpegWithGps(), await png()]);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ petName: "Milo", location: { city: "New York" } });
    expect(res.body.data.photos).toEqual([
      {
        petPhotoId: expect.any(Number),
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/photo1.webp",
        createdAt: expect.any(String),
      },
      expect.objectContaining({
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/pawradar/reports/photo2.webp",
      }),
    ]);
    // Saved with Cloudinary's id so the image can be deleted later
    expect(prisma._reports[0].photos.map((p) => p.publicId)).toEqual([
      "pawradar/reports/photo1",
      "pawradar/reports/photo2",
    ]);
    expect(cloudinary._uploads[0].options).toEqual({
      folder: "pawradar/reports",
      resource_type: "image",
    });
  });

  it("removes all metadata (including GPS), shrinks to 1600 px and converts to WebP", async () => {
    const original = await jpegWithGps();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    await send([original]);

    const stored = await sharp(cloudinary._uploads[0].buffer).metadata();
    expect(stored.format).toBe("webp");
    expect(stored.exif).toBeUndefined();
    expect([stored.width, stored.height]).toEqual([1600, 800]);
  });

  it("applies the phone's rotation instead of storing a sideways photo", async () => {
    const sideways = await solid(200, 100).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    await send([sideways]);

    const stored = await sharp(cloudinary._uploads[0].buffer).metadata();
    expect([stored.width, stored.height]).toEqual([100, 200]);
    expect(stored.orientation).toBeUndefined();
  });

  it("doesn't enlarge small photos", async () => {
    await send([await png()]);

    const stored = await sharp(cloudinary._uploads[0].buffer).metadata();
    expect([stored.width, stored.height]).toEqual([300, 200]);
  });

  it("accepts a multipart report without photos", async () => {
    const res = await send([]);

    expect(res.status).toBe(201);
    expect(res.body.data.photos).toEqual([]);
    expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it("shows the photos in GET /api/reports/mine, without the internal publicId", async () => {
    await send([await png()]);

    const res = await agent.get("/api/reports/mine");

    expect(res.body.data.reports[0].photos).toEqual([
      expect.objectContaining({ imageUrl: expect.stringContaining("photo1.webp") }),
    ]);
    expect(res.body.data.reports[0].photos[0]).not.toHaveProperty("publicId");
  });

  describe("rejected uploads (nothing is uploaded or saved)", () => {
    const expectRejected = (res, status, code) => {
      expect(res.status).toBe(status);
      expect(res.body.code).toBe(code);
      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
      expect(prisma.petReport.create).not.toHaveBeenCalled();
    };

    it("more than 5 photos (400)", async () => {
      const photo = await png();

      const res = await send(Array(6).fill(photo));

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details).toEqual([
        { field: "photos", message: "You can upload at most 5 photos" },
      ]);
    });

    it("a photo over 5 MB (400)", async () => {
      const res = await send([Buffer.alloc(5 * 1024 * 1024 + 1)]);

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0].message).toBe("Each photo must be 5 MB or smaller");
    });

    it.each([
      ["a text file named .jpg", () => Buffer.from("definitely not a photo")],
      ["a GIF", () => solid(10, 10).gif().toBuffer()],
      ["a truncated JPEG", async () => (await jpegWithGps()).subarray(0, 200)],
    ])("%s (400)", async (_, makeFile) => {
      const res = await send([await png(), await makeFile()]);

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details).toEqual([
        { field: "photos.1", message: "Photo must be a JPEG, PNG or WebP image" },
      ]);
    });

    it("a file sent under another field name (400)", async () => {
      const res = await agent
        .post("/api/reports")
        .field("report", JSON.stringify(report))
        .attach("image", await png(), "a.png");

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe("image");
    });

    it.each([
      ["no report field", (req) => req.attach("photos", Buffer.from("x"), "a.jpg"), "report"],
      ["report that isn't JSON", (req) => req.field("report", "{not json"), "report"],
      [
        "an extra text field",
        (req) => req.field("report", JSON.stringify(report)).field("userId", "someone"),
        "body",
      ],
    ])("%s (400)", async (_, build, field) => {
      const res = await build(agent.post("/api/reports"));

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe(field);
    });

    it("a single field that isn't called report (400)", async () => {
      const res = await agent.post("/api/reports").field("data", JSON.stringify(report));

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0]).toEqual({ field: "data", message: '"data" is not allowed' });
    });

    it("a malformed multipart body (400)", async () => {
      const res = await agent
        .post("/api/reports")
        .set("Content-Type", "multipart/form-data; boundary=xyz")
        .send('--xyz\r\nContent-Disposition: form-data; name="report"\r\n\r\n{"cut off');

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0]).toEqual({ field: "body", message: "Invalid form data" });
    });

    it("a report that fails validation, checked before any upload (400)", async () => {
      const { color, ...withoutColor } = report;
      void color;

      const res = await send([await png()], JSON.stringify(withoutColor));

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe("color");
    });

    it("an owner set inside the report JSON (400)", async () => {
      const res = await send(
        [await png()],
        JSON.stringify({ ...report, userId: "00000000-0000-0000-0000-000000000000" }),
      );

      expectRejected(res, 400, "VALIDATION_ERROR");
      expect(res.body.details[0].field).toBe("userId");
    });

    it("a signed-out request (401)", async () => {
      const res = await send([await png()], JSON.stringify(report), request(app));

      expectRejected(res, 401, "UNAUTHENTICATED");
    });

    it("a user who already has the maximum number of reports (403)", async () => {
      const userId = prisma._users[0].id;
      for (let i = 0; i < MAX_REPORTS_PER_USER; i++) prisma._reports.push({ userId, photos: [] });

      const res = await send([await png()]);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("REPORT_LIMIT_REACHED");
      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
    });
  });

  describe("when something fails part-way", () => {
    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      console.error.mockRestore();
    });

    it("returns 502 if an upload fails and deletes the photos that did upload", async () => {
      cloudinary.uploader.upload_stream
        .mockImplementationOnce(cloudinary._succeed)
        .mockImplementationOnce((options, callback) => ({
          end: () => setImmediate(() => callback(new Error("Cloudinary is down"))),
        }));

      const res = await send([await png(), await png()]);

      expect(res.status).toBe(502);
      expect(res.body).toEqual({
        success: false,
        code: "PHOTO_UPLOAD_FAILED",
        message: "Could not upload photos. Please try again.",
      });
      expect(cloudinary.api.delete_resources).toHaveBeenCalledWith(["pawradar/reports/photo1"]);
      expect(prisma.petReport.create).not.toHaveBeenCalled();
    });

    it("deletes the uploaded photos if saving the report fails", async () => {
      prisma.petReport.create.mockRejectedValueOnce(new Error("db down"));

      const res = await send([await png(), await png()]);

      expect(res.status).toBe(500);
      expect(cloudinary.api.delete_resources).toHaveBeenCalledWith([
        "pawradar/reports/photo1",
        "pawradar/reports/photo2",
      ]);
    });

    it("still answers with the original error if the cleanup fails too", async () => {
      prisma.petReport.create.mockRejectedValueOnce(new Error("db down"));
      cloudinary.api.delete_resources.mockRejectedValueOnce(new Error("also down"));

      const res = await send([await png()]);

      expect(res.status).toBe(500);
      expect(res.body.code).toBe("INTERNAL_ERROR");
      expect(console.error).toHaveBeenCalledWith(
        "Could not delete uploaded photos:",
        ["pawradar/reports/photo1"],
        "also down",
      );
    });

    it("refuses uploads with a server error when Cloudinary isn't configured", async () => {
      const saved = process.env.CLOUDINARY_API_SECRET;
      delete process.env.CLOUDINARY_API_SECRET;

      const res = await send([await png()]);
      process.env.CLOUDINARY_API_SECRET = saved;

      expect(res.status).toBe(502);
      expect(prisma.petReport.create).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "Photo upload failed:",
        expect.objectContaining({ message: expect.stringContaining("CLOUDINARY_API_SECRET") }),
      );
    });
  });
});
