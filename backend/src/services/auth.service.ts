import type { User } from "@prisma/client";
import prisma from "../config/prisma";
import AppError from "../utils/AppError";
import { errorCode } from "../utils/errorCode";
import { hashPassword, verifyPassword, needsRehash } from "../utils/password";
import type { ChangePasswordInput, LoginInput, RegisterInput } from "../validators/auth.validators";

// The only user fields the API ever returns
export type PublicUser = Pick<User, "id" | "email" | "name" | "createdAt">;

// Service functions return the full user record; controllers send only toPublicUser()
export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
});

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");

const emailTaken = () =>
  new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");

export const register = async ({ name, email, password }: RegisterInput): Promise<User> => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw emailTaken();

  try {
    return await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
  } catch (err) {
    // Another request registered the same email between the check and the insert
    if (errorCode(err) === "P2002") throw emailTaken();
    throw err;
  }
};

export const login = async ({ email, password }: Omit<LoginInput, "rememberMe">): Promise<User> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw invalidCredentials();
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials();

  // Upgrade hashes made with older scrypt settings while we have the plain password.
  // Not fatal: the old hash keeps working, so log and let the user in.
  if (needsRehash(user.passwordHash)) {
    try {
      return await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });
    } catch (err) {
      console.error("Could not rehash password:", (err as Error).message);
    }
  }
  return user;
};

export const findUserById = (id: string) => prisma.user.findUnique({ where: { id } });

export const changePassword = async (
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
): Promise<User> => {
  const user = await findUserById(userId);
  // Deleted after requireAuth loaded it
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
  }

  return prisma.user.update({
    where: { id: userId },
    // Bumping the version signs out every other session
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });
};
