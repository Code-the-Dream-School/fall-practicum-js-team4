const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { hashPassword, verifyPassword } = require("../utils/password");
const { verifyGoogleIdToken } = require("../utils/google");

// Service functions return the full user record; controllers send only toPublicUser(),
// the only user fields the API ever returns
const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
});

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");

const emailTaken = () =>
  new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");

const register = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw emailTaken();

  try {
    return await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
  } catch (err) {
    // Another request registered the same email between the check and the insert
    if (err.code === "P2002") throw emailTaken();
    throw err;
  }
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Google-only accounts have no password, so they fail the same way
  if (!user || !user.passwordHash) throw invalidCredentials();
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials();
  return user;
};

const loginWithGoogle = async ({ credential }) => {
  const profile = await verifyGoogleIdToken(credential);
  if (!profile) throw new AppError(401, "GOOGLE_AUTH_FAILED", "Google sign-in failed");

  const byGoogleId = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (byGoogleId) return byGoogleId;

  // Google has verified this email, so it's safe to link it to an existing account
  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    // Already linked to a different Google account: don't silently replace it
    if (byEmail.googleId) throw new AppError(401, "GOOGLE_AUTH_FAILED", "Google sign-in failed");
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.googleId, avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl },
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      avatarUrl: profile.avatarUrl,
    },
  });
};

const findUserById = (id) => prisma.user.findUnique({ where: { id } });

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await findUserById(userId);

  // Google-only accounts have no password yet, so there is nothing to confirm
  if (user.passwordHash) {
    if (!currentPassword) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
        { field: "currentPassword", message: '"currentPassword" is required' },
      ]);
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    // Bumping the version signs out every other session
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });
};

module.exports = {
  register,
  login,
  loginWithGoogle,
  findUserById,
  changePassword,
  toPublicUser,
};
