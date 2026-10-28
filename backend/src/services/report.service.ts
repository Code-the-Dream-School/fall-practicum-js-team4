import type { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import AppError from "../utils/AppError";
import type {
  CreateReportInput,
  MyReportsQuery,
  UpdateReportInput,
} from "../validators/report.validators";

// Stops one account (or a script) from filling the database and making
// GET /api/reports/mine huge, since that list isn't paginated
export const MAX_REPORTS_PER_USER = 100;

export const createReport = async (userId: string, data: CreateReportInput) => {
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

  return prisma.petReport.create({
    data: reportData,
    // Photos are left out until the photo-upload story (PetPhoto table stays)
    include: {
      location: true,
    },
  });
};

// Text fields a search matches against (case-insensitive, partial match)
const SEARCH_FIELDS = ["petName", "breed", "color", "distinctiveFeatures"] as const;

// Prisma passes `contains` to SQL LIKE without escaping, so "%" or "_" would
// act as wildcards; backslash is PostgreSQL's default LIKE escape character
const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

// Every report the user created, newest first. No pagination: one user has few reports.
// OWNER-ONLY: returns every field, including contactInfo and exact coordinates.
// A public listing must use its own query with a `select` of public fields.
export const getUserReports = (userId: string, { search }: MyReportsQuery = {}) => {
  const where: Prisma.PetReportWhereInput = { userId };

  if (search) {
    const contains: Prisma.StringFilter = { contains: escapeLike(search), mode: "insensitive" };
    where.OR = [
      ...SEARCH_FIELDS.map((field) => ({ [field]: contains })),
      { location: { is: { city: contains } } },
    ];
  }

  return prisma.petReport.findMany({
    where,
    include: {
      location: true,
    },
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
) => {
  const existing = await prisma.petReport.findUnique({
    where: { petReportId },
    include: { location: true },
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Report not found");
  }

  if (existing.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only edit your own reports");
  }

  const { location, ...fields } = data;
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

  return prisma.petReport.update({
    where: { petReportId },
    data: updateData,
    include: {
      location: true,
    },
  });
};
