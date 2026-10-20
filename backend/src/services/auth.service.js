const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { hashPassword, verifyPassword } = require("../utils/password");

// Service functions return the full user record; controllers send only toPublicUser(),
// the only user fields the API ever returns
const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
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
  if (!user) throw invalidCredentials();
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials();
  return user;
};

const findUserById = (id) => prisma.user.findUnique({ where: { id } });

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await findUserById(userId);
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
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
  findUserById,
  changePassword,
  toPublicUser,
};
