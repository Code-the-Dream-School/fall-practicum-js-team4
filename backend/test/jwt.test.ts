import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../src/utils/jwt";

const SECRET = "test-secret";
const user = { id: "user-1", tokenVersion: 3 };

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

describe("signToken / verifyToken", () => {
  it("round-trips the user id, token version and remember-me choice", () => {
    expect(verifyToken(signToken(user))).toEqual({ userId: "user-1", version: 3, remember: true });
    expect(verifyToken(signToken(user, { remember: false }))).toEqual({
      userId: "user-1",
      version: 3,
      remember: false,
    });
  });

  it("issues tokens that expire after 7 days", () => {
    const { iat, exp } = jwt.decode(signToken(user)) as { iat: number; exp: number };
    expect(exp - iat).toBe(7 * 24 * 60 * 60);
  });

  it("treats tokens issued before versioning and remember-me as version 0, remembered", () => {
    const token = jwt.sign({ sub: "user-1" }, SECRET);
    expect(verifyToken(token)).toEqual({ userId: "user-1", version: 0, remember: true });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a JWT", "not-a-jwt"],
    ["signed with another secret", jwt.sign({ sub: "user-1" }, "other-secret")],
    ["expired", jwt.sign({ sub: "user-1", exp: 1 }, SECRET)],
    ["missing the user id", jwt.sign({ ver: 0 }, SECRET)],
    ["unsigned (alg: none)", jwt.sign({ sub: "user-1" }, null, { algorithm: "none" })],
  ])("returns null for a token that is %s", (_, token) => {
    expect(verifyToken(token)).toBeNull();
  });

  it("throws instead of treating everyone as signed out when JWT_SECRET is missing", () => {
    const token = signToken(user);
    delete process.env.JWT_SECRET;

    expect(() => signToken(user)).toThrow("JWT_SECRET is not set");
    expect(() => verifyToken(token)).toThrow("JWT_SECRET is not set");
  });
});
