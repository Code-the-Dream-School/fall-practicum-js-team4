const { hashPassword, verifyPassword } = require("../src/utils/password");

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct-horse-1");
    expect(await verifyPassword("correct-horse-1", stored)).toBe(true);
    expect(await verifyPassword("correct-horse-2", stored)).toBe(false);
  });

  it("uses a different salt every time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("returns false for a malformed stored value", async () => {
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });
});
