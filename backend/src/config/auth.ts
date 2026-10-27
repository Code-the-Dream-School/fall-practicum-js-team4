import type { CookieOptions } from "express";

// Session settings shared by the JWT helpers and the auth controller
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const COOKIE_NAME = "token";

export const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Passed through as before; Express rejects anything but lax, strict or none
  sameSite: (process.env.COOKIE_SAME_SITE || "lax") as CookieOptions["sameSite"],
  path: "/",
});
