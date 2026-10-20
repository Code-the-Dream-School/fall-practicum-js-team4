// Password hashing with Node's built-in scrypt.
// Stored as "scrypt$N$r$p$salt$hash" (salt and hash in hex), so the cost can be
// raised later without breaking existing hashes.
const crypto = require("crypto");

// OWASP minimum for scrypt. Raising these makes needsRehash() upgrade users on login.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
// Hashes from before parameters were stored ("salt:hash") used Node's defaults
const LEGACY_PARAMS = { N: 2 ** 14, r: 8, p: 1 };
// N=2^17, r=8 needs 128 MiB; Node's default limit is 32 MiB
const MAXMEM = 256 * 1024 * 1024;
const KEY_LENGTH = 64;

const HEX = /^[0-9a-f]+$/i;
const POSITIVE_INT = /^[1-9]\d*$/;

const scrypt = (password, salt, { N, r, p }) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });

// Returns { params, salt, hash } or null if the stored value is malformed
const parse = (stored) => {
  if (typeof stored !== "string") return null;

  let params, salt, hashHex;
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 6) return null;
    const [, N, r, p] = parts;
    if (![N, r, p].every((n) => POSITIVE_INT.test(n))) return null;
    params = { N: Number(N), r: Number(r), p: Number(p) };
    [, , , , salt, hashHex] = parts;
  } else {
    const parts = stored.split(":");
    if (parts.length !== 2) return null;
    params = LEGACY_PARAMS;
    [salt, hashHex] = parts;
  }

  // Buffer.from(..., "hex") silently drops invalid characters, so check first;
  // a wrong-length key would otherwise compare equal to an equally short result
  if (!salt || !HEX.test(salt) || !HEX.test(hashHex) || hashHex.length !== KEY_LENGTH * 2) {
    return null;
  }
  return { params, salt, hash: Buffer.from(hashHex, "hex") };
};

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt}$${hash.toString("hex")}`;
};

const verifyPassword = async (password, stored) => {
  const parsed = parse(stored);
  if (!parsed) return false;
  const actual = await scrypt(password, parsed.salt, parsed.params);
  return crypto.timingSafeEqual(actual, parsed.hash);
};

// True when the hash uses older settings than PARAMS (or the legacy format)
const needsRehash = (stored) => {
  const parsed = parse(stored);
  if (!parsed) return false;
  const { N, r, p } = parsed.params;
  return N !== PARAMS.N || r !== PARAMS.r || p !== PARAMS.p || !stored.startsWith("scrypt$");
};

module.exports = { hashPassword, verifyPassword, needsRehash, PARAMS };
