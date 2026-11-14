import type { PetType, Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import AppError from "../utils/AppError";
import { MAX_PHOTOS } from "../middleware/photoUpload";
import { deleteImages, storePhotos } from "./photo.service";
import type {
  CreateReportInput,
  ListReportsQuery,
  MyReportsQuery,
  UpdateReportInput,
} from "../validators/report.validators";

// Stops one account (or a script) from filling the database and making
// GET /api/reports/mine huge, since that list isn't paginated
export const MAX_REPORTS_PER_USER = 100;

// Photo fields sent to clients; publicId (Cloudinary's id) stays internal
const PHOTOS = {
  select: { petPhotoId: true, imageUrl: true, createdAt: true },
  // Same order the files were uploaded in
  orderBy: { petPhotoId: "asc" },
} satisfies Prisma.PetReport$photosArgs;

// Public report summary fields for GET /api/reports: omits userId, contactInfo,
// exact coordinates (latitude/longitude), and Cloudinary publicId
const PUBLIC_REPORT_SELECT = {
  petReportId: true,
  reportType: true,
  petType: true,
  petName: true,
  breed: true,
  color: true,
  size: true,
  gender: true,
  distinctiveFeatures: true,
  eventDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  location: {
    select: {
      locationId: true,
      petReportId: true,
      zipCode: true,
      city: true,
      state: true,
    },
  },
  photos: PHOTOS,
} satisfies Prisma.PetReportSelect;

// Text fields a search matches against (case-insensitive, partial match)
const SEARCH_FIELDS = ["petName", "breed", "color", "distinctiveFeatures"] as const;

// Prisma passes `contains` to SQL LIKE without escaping, so "%" or "_" would
// act as wildcards; backslash is PostgreSQL's default LIKE escape character
const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

// Words that name a pet type, singular or plural ("dog", "Dogs"). The type is
// stored as an enum, which can't be partly matched like text. A Map, not an
// object: an object would also "contain" built-in keys like "constructor"
const PET_TYPE_WORDS = new Map<string, PetType>([
  ["dog", "DOG"],
  ["dogs", "DOG"],
  ["cat", "CAT"],
  ["cats", "CAT"],
  ["bird", "BIRD"],
  ["birds", "BIRD"],
]);

// Reports whose text fields or city contain `search`, or whose pet type it
// names (all ignoring case)
const searchWhere = (search: string): Prisma.PetReportWhereInput => {
  const contains: Prisma.StringFilter = { contains: escapeLike(search), mode: "insensitive" };
  const petType = PET_TYPE_WORDS.get(search.toLowerCase());
  return {
    OR: [
      ...SEARCH_FIELDS.map((field) => ({ [field]: contains })),
      { location: { is: { city: contains } } },
      ...(petType ? [{ petType }] : []),
    ],
  };
};

export const listReports = async ({
  page = 1,
  limit = 20,
  type,
  status = "ACTIVE",
  search,
  petType,
  size,
  gender,
  sort = "newest",
}: Partial<ListReportsQuery> = {}) => {
  const skip = (page - 1) * limit;
  const where: Prisma.PetReportWhereInput = { status };

  if (type) where.reportType = type;
  if (petType) where.petType = petType;
  if (size) where.size = size;
  if (gender) where.gender = gender;
  if (search) Object.assign(where, searchWhere(search));

  const direction = sort === "oldest" ? "asc" : "desc";

  const [total, reports] = await Promise.all([
    prisma.petReport.count({ where }),
    prisma.petReport.findMany({
      where,
      select: PUBLIC_REPORT_SELECT,
      // petReportId breaks ties between reports created in the same millisecond
      orderBy: [{ createdAt: direction }, { petReportId: direction }],
      skip,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    reports,
  };
};

// files: uploaded photos from multer ([] for JSON requests)
export const createReport = async (
  userId: string,
  data: CreateReportInput,
  files: Express.Multer.File[],
) => {
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

  const reportData: Prisma.PetReportUncheckedCreateInput = {
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

// Every report the user created, newest first. No pagination: one user has few reports.
// OWNER-ONLY: returns every field, including contactInfo and exact coordinates.
// A public listing must use its own query with a `select` of public fields.
export const getUserReports = (userId: string, { search }: MyReportsQuery = {}) => {
  const where: Prisma.PetReportWhereInput = { userId };

  if (search) Object.assign(where, searchWhere(search));

  return prisma.petReport.findMany({
    where,
    include: { location: true, photos: PHOTOS },
    // petReportId breaks ties between reports created in the same millisecond
    orderBy: [{ createdAt: "desc" }, { petReportId: "desc" }],
  });
};

// Optional text fields where an empty string clears the stored value to null
const NULLABLE_TEXT_FIELDS = ["petName", "breed", "distinctiveFeatures", "contactInfo"] as const;

export const updateReport = async (
  userId: string,
  petReportId: number,
  data: UpdateReportInput,
  files: Express.Multer.File[] = [],
) => {
  // Check existence, ownership, and current photo count
  const existing = await prisma.petReport.findUnique({
    where: { petReportId },
    include: { location: true, photos: true },
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Report not found");
  }

  if (existing.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only edit your own reports");
  }

  const { location, deletePhotoIds, ...fields } = data;

  // Validate that all deletePhotoIds belong to this report
  if (deletePhotoIds && deletePhotoIds.length > 0) {
    const existingPhotoIds = new Set(existing.photos.map((p) => p.petPhotoId));
    const invalidId = deletePhotoIds.find((id) => !existingPhotoIds.has(id));
    if (invalidId !== undefined) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
        {
          field: "deletePhotoIds",
          message: `Photo ${invalidId} does not belong to this report`,
        },
      ]);
    }
  }

  const photosToDelete =
    deletePhotoIds && deletePhotoIds.length > 0
      ? existing.photos.filter((p) => deletePhotoIds.includes(p.petPhotoId))
      : [];

  const remainingPhotosCount = existing.photos.length - photosToDelete.length;

  if (files.length > 0 && remainingPhotosCount + files.length > MAX_PHOTOS) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
      {
        field: "photos",
        message: `You can upload at most ${MAX_PHOTOS} photos`,
      },
    ]);
  }

  const updateData: Prisma.PetReportUpdateInput = { ...fields };

  for (const field of NULLABLE_TEXT_FIELDS) {
    if (field in fields) {
      updateData[field] = fields[field] || null;
    }
  }

  if (location !== undefined) {
    if (location === null) {
      if (existing.location) {
        updateData.location = { delete: true };
      }
    } else {
      const locationFields = {
        zipCode: location.zipCode,
        city: location.city,
        state: location.state,
      };
      updateData.location = {
        upsert: {
          create: locationFields,
          // Clear any old coordinates so they never point to a previous address
          update: { ...locationFields, latitude: null, longitude: null },
        },
      };
    }
  }

  const newPhotos = await storePhotos(files);
  const photoOperations: Prisma.PetPhotoUpdateManyWithoutPetReportNestedInput = {};

  if (photosToDelete.length > 0) {
    photoOperations.deleteMany = {
      petPhotoId: { in: photosToDelete.map((p) => p.petPhotoId) },
    };
  }

  if (newPhotos.length > 0) {
    photoOperations.createMany = { data: newPhotos };
  }

  if (Object.keys(photoOperations).length > 0) {
    updateData.photos = photoOperations;
  }

  try {
    const updated = await prisma.petReport.update({
      where: { petReportId },
      data: updateData,
      include: { location: true, photos: PHOTOS },
    });

    if (photosToDelete.length > 0) {
      const publicIdsToDelete = photosToDelete
        .map((p) => p.publicId)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      if (publicIdsToDelete.length > 0) {
        await deleteImages(publicIdsToDelete);
      }
    }

    return updated;
  } catch (err) {
    if (newPhotos.length > 0) {
      await deleteImages(newPhotos.map((photo) => photo.publicId));
    }
    throw err;
  }
};

export const getReportById = async (userId: string, petReportId: number) => {
  const report = await prisma.petReport.findUnique({
    where: { petReportId },
    include: { location: true, photos: PHOTOS },
  });

  if (!report) {
    throw new AppError(404, "NOT_FOUND", "Report not found");
  }

  if (report.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only view your own reports");
  }
  return report;
};
