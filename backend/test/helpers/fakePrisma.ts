import crypto from "crypto";

// In-memory stand-in for the Prisma client, so tests don't need a database.
// Use it in a test file with:
//   jest.mock("../src/config/prisma", () =>
//     jest.requireActual<typeof import("./helpers/fakePrisma")>("./helpers/fakePrisma").createFakePrisma(),
//   );
//   const prisma = jest.requireMock<FakePrisma>("../src/config/prisma");

export interface FakeUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakePhoto {
  petPhotoId: number;
  petReportId: number;
  imageUrl: string;
  publicId: string | null;
  createdAt: Date;
}

// Tests may add partial reports directly (e.g. to fill up the report limit)
export interface FakeReport {
  petReportId: number;
  userId: string;
  createdAt?: Date;
  photos?: FakePhoto[];
  updatedAt?: Date;
  location?: Record<string, unknown> | null;
  [field: string]: unknown;
}

// The `include` or `select` the report queries pass; photos.select picks fields like Prisma
interface ReportInclude {
  photos?: { select: Partial<Record<keyof FakePhoto, boolean>> };
  location?: boolean | { select: Record<string, boolean> };
  [relation: string]: unknown;
}

type UserWhere = Partial<Pick<FakeUser, "id" | "email">>;
// The report query's filter; OR holds the search conditions
type Contains = { contains: string; mode?: "insensitive" };
type FindManyWhere = {
  userId?: string;
  reportType?: string;
  status?: string;
  petType?: string;
  size?: string;
  gender?: string;
  // Mostly { field: Contains }; also { location: { is: { city: Contains } } }
  // and { petType: "DOG" } when the search names a pet type
  OR?: Record<string, Contains>[];
};

// Fields compared by exact value, like Prisma's `{ field: value }`
const EQUAL_FIELDS = ["userId", "reportType", "status", "petType", "size", "gender"] as const;

// Prisma's `contains` with mode "insensitive"; the search escapes % _ \ for SQL
// LIKE, so unescape them to compare as plain text
const contains = (value: unknown, { contains: text }: Contains) =>
  typeof value === "string" &&
  value.toLowerCase().includes(text.replace(/\\([\\%_])/g, "$1").toLowerCase());

const matchesSearch = (report: FakeReport, or: NonNullable<FindManyWhere["OR"]>) =>
  or.some((condition) =>
    Object.entries(condition).some(([field, filter]: [string, unknown]) => {
      if (typeof filter === "string") return report[field] === filter;
      if (field === "location") {
        return contains(report.location?.city, (filter as { is: { city: Contains } }).is.city);
      }
      return contains(report[field], filter as Contains);
    }),
  );

const matchesReportWhere = (report: FakeReport, where?: FindManyWhere) =>
  EQUAL_FIELDS.every((field) => !where?.[field] || report[field] === where[field]) &&
  (!where?.OR || matchesSearch(report, where.OR));

// A report as Prisma returns it: photos reduced to the selected fields
const withSelectedPhotos = (report: FakeReport, include?: ReportInclude) => {
  const select = include?.photos?.select;
  if (!select) return report;
  const pick = (photo: FakePhoto) =>
    Object.fromEntries(Object.keys(select).map((key) => [key, photo[key as keyof FakePhoto]]));
  return { ...report, photos: (report.photos ?? []).map(pick) };
};

// Applies a top-level Prisma `select` object (including nested location/photos select)
const withSelectedFields = (report: FakeReport, select?: ReportInclude) => {
  if (!select) return report;
  const result: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(select)) {
    if (!spec) continue;
    if (key === "photos" && typeof spec === "object" && "select" in spec) {
      const photoSelect = (spec as { select: Record<string, boolean> }).select;
      result.photos = (report.photos ?? []).map((photo) =>
        Object.fromEntries(Object.keys(photoSelect).map((k) => [k, photo[k as keyof FakePhoto]])),
      );
    } else if (key === "location" && typeof spec === "object" && "select" in spec) {
      if (!report.location) {
        result.location = null;
      } else {
        const locSelect = (spec as { select: Record<string, boolean> }).select;
        result.location = Object.fromEntries(
          Object.keys(locSelect).map((k) => [k, report.location![k]]),
        );
      }
    } else {
      result[key] = report[key];
    }
  }
  return result;
};
// Prisma update values: a plain value, or { increment: n } for numbers
type UpdateValue = unknown | { increment: number };

export const createFakePrisma = () => {
  const users: FakeUser[] = [];
  const reports: FakeReport[] = [];
  let nextReportId = 1;
  let nextPhotoId = 1;

  const findUser = (where: UserWhere) =>
    users.find((u) =>
      Object.entries(where).every(([key, value]) => u[key as keyof FakeUser] === value),
    ) ?? null;

  return {
    _users: users,
    _reports: reports,
    user: {
      findUnique: jest.fn(async ({ where }: { where: UserWhere }) => findUser(where)),
      create: jest.fn(
        async ({ data }: { data: Pick<FakeUser, "name" | "email" | "passwordHash"> }) => {
          if (findUser({ email: data.email })) {
            throw Object.assign(new Error("unique"), { code: "P2002" });
          }
          const now = new Date();
          const user: FakeUser = {
            id: crypto.randomUUID(),
            tokenVersion: 0,
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          users.push(user);
          return user;
        },
      ),
      update: jest.fn(
        async ({ where, data }: { where: UserWhere; data: Record<string, UpdateValue> }) => {
          const user = findUser(where) as FakeUser & Record<string, unknown>;
          for (const [key, value] of Object.entries(data)) {
            const increment = (value as { increment?: number })?.increment;
            user[key] = increment !== undefined ? (user[key] as number) + increment : value;
          }
          return user;
        },
      ),
    },
    petReport: {
      create: jest.fn(
        async ({ data, include }: { data: Record<string, unknown>; include?: ReportInclude }) => {
          const petReportId = nextReportId++;
          const { location, photos, ...fields } = data as {
            location?: { create: Record<string, unknown> };
            photos?: { createMany: { data: { imageUrl: string; publicId: string }[] } };
          } & Record<string, unknown>;
          const report: FakeReport = {
            ...fields,
            petReportId,
            userId: fields.userId as string,
            status: "ACTIVE",
            createdAt: new Date(),
            updatedAt: new Date(),
            location: location ? { locationId: 1, petReportId, ...location.create } : null,
            photos: (photos?.createMany.data ?? []).map((photo) => ({
              petPhotoId: nextPhotoId++,
              petReportId,
              createdAt: new Date(),
              ...photo,
            })),
          };
          reports.push(report);
          return withSelectedPhotos(report, include);
        },
      ),
      findUnique: jest.fn(async ({ where }: { where: { petReportId: number } }) => {
        return reports.find((r) => r.petReportId === where.petReportId) ?? null;
      }),
      update: jest.fn(
        async ({
          where,
          data,
          include,
        }: {
          where: { petReportId: number };
          data: Record<string, unknown>;
          include?: ReportInclude;
        }) => {
          const report = reports.find((r) => r.petReportId === where.petReportId)!;
          const { location, photos, ...fields } = data as {
            location?: {
              delete?: boolean;
              upsert?: { create: Record<string, unknown>; update: Record<string, unknown> };
            };
            photos?: { createMany: { data: { imageUrl: string; publicId: string }[] } };
          } & Record<string, unknown>;

          Object.assign(report, fields, { updatedAt: new Date() });

          if (location?.delete) {
            report.location = null;
          } else if (location?.upsert) {
            report.location = report.location
              ? { ...report.location, ...location.upsert.update }
              : { locationId: 1, petReportId: report.petReportId, ...location.upsert.create };
          }

          if (photos?.createMany?.data) {
            report.photos = [
              ...(report.photos ?? []),
              ...photos.createMany.data.map((photo) => ({
                petPhotoId: nextPhotoId++,
                petReportId: report.petReportId,
                createdAt: new Date(),
                ...photo,
              })),
            ];
          }

          // Apply the photo `select` like Prisma does
          return withSelectedPhotos(report, include);
        },
      ),
      count: jest.fn(
        async ({ where }: { where?: FindManyWhere } = {}) =>
          reports.filter((r) => matchesReportWhere(r, where)).length,
      ),
      // Filters by where conditions, sorts newest first, and
      // applies skip/take/select/include like the real Prisma query
      findMany: jest.fn(
        async ({
          where,
          include,
          select,
          skip,
          take,
          orderBy,
        }: {
          where: FindManyWhere;
          include?: ReportInclude;
          select?: ReportInclude;
          skip?: number;
          take?: number;
          orderBy?: { createdAt?: "asc" | "desc" }[];
        }) => {
          const filtered = reports.filter((r) => matchesReportWhere(r, where));
          // Newest first unless the query asks for oldest first
          const order = orderBy?.[0]?.createdAt === "asc" ? -1 : 1;
          const sorted = filtered.sort(
            (a, b) =>
              order *
              ((b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) ||
                b.petReportId - a.petReportId),
          );
          const start = skip ?? 0;
          const sliced =
            take !== undefined ? sorted.slice(start, start + take) : sorted.slice(start);
          return sliced.map((r) =>
            select ? withSelectedFields(r, select) : withSelectedPhotos(r, include),
          );
        },
      ),
    },
  };
};

export type FakePrisma = ReturnType<typeof createFakePrisma>;
