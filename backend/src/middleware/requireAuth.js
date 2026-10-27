const { COOKIE_NAME } = require("../config/auth");
const { verifyToken } = require("../utils/jwt");
const { findUserById, toPublicUser } = require("../services/auth.service");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

// Sets req.user to the signed-in user, or responds 401 UNAUTHENTICATED
const requireAuth = asyncHandler(async (req, res, next) => {
  // Responses here hold one user's data: never let a browser or a shared
  // cache (CDN, proxy) store them and hand them to someone else
  res.set("Cache-Control", "private, no-store");
  const session = verifyToken(req.cookies?.[COOKIE_NAME]);
  const user = session && (await findUserById(session.userId));
  // A version mismatch means the token was issued before a password change
  if (!user || user.tokenVersion !== session.version) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  }
  req.user = toPublicUser(user);
  next();
});

module.exports = requireAuth;
