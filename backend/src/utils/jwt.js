const jwt = require("jsonwebtoken");
const { SESSION_DURATION_MS } = require("../config/auth");

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

// ver lets us invalidate every older token by bumping user.tokenVersion.
// rem records "remember me", so a reissued cookie keeps the same lifetime.
const signToken = (user, { remember = true } = {}) =>
  jwt.sign({ sub: user.id, ver: user.tokenVersion, rem: remember }, getSecret(), {
    algorithm: "HS256",
    expiresIn: Math.floor(SESSION_DURATION_MS / 1000),
  });

// Returns { userId, version, remember }, or null if the token is missing, invalid or expired
const verifyToken = (token) => {
  if (!token) return null;
  const secret = getSecret();
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    // Tokens issued before "remember me" existed were all 7-day cookies
    return { userId: payload.sub, version: payload.ver ?? 0, remember: payload.rem !== false };
  } catch {
    return null;
  }
};

module.exports = { signToken, verifyToken };
