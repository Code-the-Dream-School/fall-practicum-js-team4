// The `code` of an error from Node or Prisma (e.g. "P2002"), if it has one
export const errorCode = (err: unknown): unknown =>
  typeof err === "object" && err !== null && "code" in err ? err.code : undefined;
