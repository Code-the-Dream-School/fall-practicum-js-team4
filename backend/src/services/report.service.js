const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { storePhotos, deleteImages } = require("./photo.service");

// Stops one account (or a script) from filling the database and making
// GET /api/reports/mine huge, since that list isn't paginated
const MAX_REPORTS_PER_USER = 100;

// Photo fields sent to clients; publicId (Cloudinary's id) stays internal
const PHOTOS = {
  select: { petPhotoId: true, imageUrl: true, createdAt: true },
  // Same order the files were uploaded in
  orderBy: { petPhotoId: "asc" },
};

// files: uploaded photos from multer ([] for JSON requests)
const createReport = async (userId, data, files) => {
  // Count-then-create isn't atomic: parallel requests can pass the check together
  // and go a few over. Fine for a cap whose job is to stop abuse, not to be exact.
  const existing = await prisma.petReport.count({ where: { userId } });
  if (existing >= MAX_REPORTS_PER_USER) {
    throw new AppError(
      403,
      "REPORT_LIMIT_REACHED",
      `You can have at most ${MAX_REPORTS_PER_USER} reports.`,
    );
  }

  const { petName, breed, distinctiveFeatures, contactInfo, location, ...rest } = data;

  const reportData = {
    ...rest,
    userId,
    petName: petName || null,
    breed: breed || null,
    distinctiveFeatures: distinctiveFeatures || null,
    contactInfo: contactInfo || null,
  };

  if (location) {
    reportData.location = {
      create: {
        zipCode: location.zipCode,
        city: location.city,
        state: location.state,
      },
    };
  }

  // After the checks above, so a rejected report never uploads anything
  const photos = await storePhotos(files);
  if (photos.length > 0) {
    reportData.photos = { createMany: { data: photos } };
  }

  try {
    return await prisma.petReport.create({
      data: reportData,
      include: { location: true, photos: PHOTOS },
    });
  } catch (err) {
    // Don't leave images in Cloudinary that no report points to
    await deleteImages(photos.map((photo) => photo.publicId));
    throw err;
  }
};

// Text fields a search matches against (case-insensitive, partial match)
const SEARCH_FIELDS = ["petName", "breed", "color", "distinctiveFeatures"];

// Prisma passes `contains` to SQL LIKE without escaping, so "%" or "_" would
// act as wildcards; backslash is PostgreSQL's default LIKE escape character
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

// Every report the user created, newest first. No pagination: one user has few reports.
// OWNER-ONLY: returns every field, including contactInfo and exact coordinates.
// A public listing must use its own query with a `select` of public fields.
const getUserReports = (userId, { search } = {}) => {
  const where = { userId };

  if (search) {
    const contains = { contains: escapeLike(search), mode: "insensitive" };
    where.OR = [
      ...SEARCH_FIELDS.map((field) => ({ [field]: contains })),
      { location: { is: { city: contains } } },
    ];
  }

  return prisma.petReport.findMany({
    where,
    include: { location: true, photos: PHOTOS },
    // petReportId breaks ties between reports created in the same millisecond
    orderBy: [{ createdAt: "desc" }, { petReportId: "desc" }],
  });
};

module.exports = {
  createReport,
  getUserReports,
  MAX_REPORTS_PER_USER,
};
