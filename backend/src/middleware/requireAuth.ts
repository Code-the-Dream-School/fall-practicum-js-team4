import { COOKIE_NAME } from "../config/auth";
import { verifyToken } from "../utils/jwt";
import { findUserById, toPublicUser } from "../services/auth.service";
import AppError from "../utils/AppError";
import asyncHandler from "../utils/asyncHandler";

// Sets req.user to the signed-in user, or responds 401 UNAUTHENTICATED
const requireAuth = asyncHandler(async (req, res, next) => {
  // Responses here hold one user's data: never let a browser or a shared
  // cache (CDN, proxy) store them and hand them to someone else
  res.set("Cache-Control", "private, no-store");
  const session = verifyToken(req.cookies?.[COOKIE_NAME]);
  const user = session && (await findUserById(session.userId));
  // A version mismatch means the token was issued before a password change
  if (!session || !user || user.tokenVersion !== session.version) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  }
  req.user = toPublicUser(user);
  next();
});

export default requireAuth;
