const crypto = require("crypto");
const { hashPassword, verifyPassword, needsRehash, PARAMS } = require("../src/utils/password");

// A hash in the original "salt:hash" format, made with Node's default scrypt settings
const legacyHash = (password, salt = "a1b2c3d4e5f60718") =>
  `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct-horse-1");
    expect(await verifyPassword("correct-horse-1", stored)).toBe(true);
    expect(await verifyPassword("correct-horse-2", stored)).toBe(false);
  });

  it("stores the OWASP minimum parameters with the hash", async () => {
    expect(PARAMS).toEqual({ N: 2 ** 17, r: 8, p: 1 });
    const stored = await hashPassword("pw");
    expect(stored).toMatch(/^scrypt\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it("uses a different salt every time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("still verifies legacy salt:hash values with the old default settings", async () => {
    const stored = legacyHash("correct-horse-1");
    expect(await verifyPassword("correct-horse-1", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });

  it.each([
    ["garbage", "garbage"],
    ["an empty hash", "salt:"],
    ["a hash that decodes to too few bytes", "salt:zz"],
    ["a short hash", `abcd:${"ab".repeat(10)}`],
    ["a hash with non-hex characters", `abcd:${"zz".repeat(64)}`],
    ["a non-hex salt", `not-hex:${"ab".repeat(64)}`],
    ["too many parts", `scrypt$131072$8$1$abcd$${"ab".repeat(64)}$extra`],
    ["non-numeric parameters", `scrypt$big$8$1$abcd$${"ab".repeat(64)}`],
    ["a zero parameter", `scrypt$0$8$1$abcd$${"ab".repeat(64)}`],
    ["a non-string value", null],
    ["N that isn't a power of 2", `scrypt$3$8$1$abcd$${"ab".repeat(64)}`],
    ["settings over the memory limit", `scrypt$${2 ** 20}$8$1$abcd$${"ab".repeat(64)}`],
  ])("returns false for %s", async (_, stored) => {
    expect(await verifyPassword("any-password", stored)).toBe(false);
  });
});

describe("when scrypt itself fails", () => {
  afterEach(() => jest.restoreAllMocks());

  const failScrypt = (err) =>
    jest.spyOn(crypto, "scrypt").mockImplementation((...args) => args.at(-1)(err));

  it("hashPassword rejects with the error", async () => {
    failScrypt(new Error("out of memory"));
    await expect(hashPassword("pw")).rejects.toThrow("out of memory");
  });

  it("verifyPassword rethrows errors other than invalid settings", async () => {
    const stored = await hashPassword("pw");
    failScrypt(new Error("out of memory"));
    await expect(verifyPassword("pw", stored)).rejects.toThrow("out of memory");
  });
});

describe("needsRehash", () => {
  it("is false for hashes made with the current settings", async () => {
    expect(needsRehash(await hashPassword("pw"))).toBe(false);
  });

  it("is true for legacy salt:hash values", () => {
    expect(needsRehash(legacyHash("pw"))).toBe(true);
  });

  it("is true when the stored parameters are older than the current ones", () => {
    expect(needsRehash(`scrypt$16384$8$1$abcd$${"ab".repeat(64)}`)).toBe(true);
  });

  it("is false for malformed values (they can't verify, so there's nothing to upgrade)", () => {
    expect(needsRehash("salt:zz")).toBe(false);
  });
});
