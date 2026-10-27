import jwt from "jsonwebtoken";
import { SESSION_DURATION_MS } from "../config/auth";

// What a token needs from the user record
interface TokenUser {
  id: string;
  tokenVersion: number;
}

export interface Session {
  userId: string;
  version: number;
  remember: boolean;
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

// ver lets us invalidate every older token by bumping user.tokenVersion.
// rem records "remember me", so a reissued cookie keeps the same lifetime.
export const signToken = (user: TokenUser, { remember = true }: { remember?: boolean } = {}) =>
  jwt.sign({ sub: user.id, ver: user.tokenVersion, rem: remember }, getSecret(), {
    algorithm: "HS256",
    expiresIn: Math.floor(SESSION_DURATION_MS / 1000),
  });

// Returns the session, or null if the token is missing, invalid or expired
export const verifyToken = (token: string | undefined): Session | null => {
  if (!token) return null;
  const secret = getSecret();
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") return null;
    // Tokens issued before "remember me" existed were all 7-day cookies
    return { userId: payload.sub, version: payload.ver ?? 0, remember: payload.rem !== false };
  } catch {
    return null;
  }
};
