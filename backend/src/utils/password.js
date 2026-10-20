// Password hashing with Node's built-in scrypt; stored as "salt:hash" (hex)
const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("hex")}`;
};

const verifyPassword = async (password, stored) => {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
};

module.exports = { hashPassword, verifyPassword };
