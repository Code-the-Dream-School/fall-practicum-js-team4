// Session settings shared by the JWT helpers and the auth controller
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_NAME = "token";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  path: "/",
});

module.exports = { SESSION_DURATION_MS, COOKIE_NAME, cookieOptions };
