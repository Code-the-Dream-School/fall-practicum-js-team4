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

// Tests may add partial reports directly (e.g. to fill up the report limit)
export interface FakeReport {
  petReportId: number;
  userId: string;
  createdAt?: Date;
  [field: string]: unknown;
}

type UserWhere = Partial<Pick<FakeUser, "id" | "email">>;
// The report query's filter; OR holds the search conditions
type FindManyWhere = { userId: string; OR?: Record<string, { contains: string }>[] };
// Prisma update values: a plain value, or { increment: n } for numbers
type UpdateValue = unknown | { increment: number };

export const createFakePrisma = () => {
  const users: FakeUser[] = [];
  const reports: FakeReport[] = [];
  let nextReportId = 1;

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
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const petReportId = nextReportId++;
        const { location, ...fields } = data as {
          location?: { create: Record<string, unknown> };
        } & Record<string, unknown>;
        const report: FakeReport = {
          ...fields,
          petReportId,
          userId: fields.userId as string,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          location: location ? { locationId: 1, petReportId, ...location.create } : null,
        };
        reports.push(report);
        return report;
      }),
      count: jest.fn(
        async ({ where }: { where: { userId: string } }) =>
          reports.filter((r) => r.userId === where.userId).length,
      ),
      // Filters by owner only and sorts like the real query; search filters are
      // checked through the arguments (and against a real database by hand)
      findMany: jest.fn(async ({ where }: { where: FindManyWhere; [option: string]: unknown }) =>
        reports
          .filter((r) => r.userId === where.userId)
          .sort(
            (a, b) =>
              (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) ||
              b.petReportId - a.petReportId,
          ),
      ),
    },
  };
};

export type FakePrisma = ReturnType<typeof createFakePrisma>;
