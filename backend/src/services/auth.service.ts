import type { User } from "@prisma/client";
import prisma from "../config/prisma";
import AppError from "../utils/AppError";
import { errorCode } from "../utils/errorCode";
import { hashPassword, verifyPassword, needsRehash } from "../utils/password";
import { verifyGoogleIdToken } from "../utils/google";
import type {
  ChangePasswordInput,
  GoogleLoginInput,
  LinkGoogleInput,
  LoginInput,
  RegisterInput,
} from "../validators/auth.validators";

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

const noPassword = () =>
  new AppError(400, "NO_PASSWORD", "This account signs in with Google and has no password");

const wrongPassword = () =>
  new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");

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
  // Accounts created with Google have no password: they can only sign in with
  // Google, and fail here the same way as a wrong password
  if (!user?.passwordHash) throw invalidCredentials();
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
  // Adding a password to a Google account would open a second way in that
  // doesn't go through Google
  if (!user.passwordHash) throw noPassword();
  if (!(await verifyPassword(currentPassword, user.passwordHash))) throw wrongPassword();

  return prisma.user.update({
    where: { id: userId },
    // Bumping the version signs out every other session
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });
};

// The email belongs to an account that isn't linked to this Google account.
// A matching email is never enough to link them: PawRadar doesn't verify
// emails at sign-up, so whoever registered the address first may not own it.
const googleNotLinked = () =>
  new AppError(
    409,
    "GOOGLE_ACCOUNT_NOT_LINKED",
    "An account with this email already exists. Sign in with your password, then connect Google from your profile.",
  );

const alreadyLinked = () =>
  new AppError(
    409,
    "GOOGLE_ALREADY_LINKED",
    "A different Google account is already connected to this account",
  );

const googleInUse = () =>
  new AppError(
    409,
    "GOOGLE_ACCOUNT_IN_USE",
    "This Google account is already connected to another PawRadar account",
  );

// Signs in with Google, creating the account on first use. Matches accounts
// by Google's account id only; `created` is true for a new account.
export const loginWithGoogle = async ({
  credential,
}: Pick<GoogleLoginInput, "credential">): Promise<{ user: User; created: boolean }> => {
  const profile = await verifyGoogleIdToken(credential);

  const linked = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (linked) return { user: linked, created: false };

  // Not a second account for the same email, and not a silent link either
  if (await prisma.user.findUnique({ where: { email: profile.email } })) throw googleNotLinked();

  try {
    const user = await prisma.user.create({
      data: { name: profile.name, email: profile.email, googleId: profile.googleId },
    });
    return { user, created: true };
  } catch (err) {
    if (errorCode(err) !== "P2002") throw err;
    // Another request created it between the checks and the insert: a double
    // click (same Google account, sign them in) or a password sign-up
    const winner = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (winner) return { user: winner, created: false };
    throw googleNotLinked();
  }
};

// Connects a Google account to the signed-in user, so they can sign in with
// either. The password proves they own this account and the Google token
// proves they own the Google one; the two emails don't have to match.
export const linkGoogle = async (
  userId: string,
  { credential, password }: LinkGoogleInput,
): Promise<User> => {
  const user = await findUserById(userId);
  // Deleted after requireAuth loaded it
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  if (!user.passwordHash) throw noPassword();
  if (!(await verifyPassword(password, user.passwordHash))) throw wrongPassword();

  const profile = await verifyGoogleIdToken(credential);
  // Linking the same Google account again changes nothing
  if (user.googleId === profile.googleId) return user;
  if (user.googleId) throw alreadyLinked();
  if (await prisma.user.findUnique({ where: { googleId: profile.googleId } })) {
    throw googleInUse();
  }

  let count;
  try {
    // updateMany, because `googleId: null` can't go in update()'s unique
    // `where`. It makes the write skip the user if another request linked a
    // Google account to them since they were read.
    ({ count } = await prisma.user.updateMany({
      where: { id: userId, googleId: null },
      data: { googleId: profile.googleId },
    }));
  } catch (err) {
    // Linked to another PawRadar account in the meantime
    if (errorCode(err) === "P2002") throw googleInUse();
    throw err;
  }
  if (count === 0) throw alreadyLinked();
  return { ...user, googleId: profile.googleId };
};
