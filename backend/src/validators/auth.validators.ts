import Joi from "joi";

// Shapes of the request bodies after validation
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface GoogleLoginInput {
  credential: string;
  rememberMe: boolean;
}

export interface LinkGoogleInput {
  credential: string;
  password: string;
}

const email = Joi.string().trim().lowercase().email().max(254).required();

// A Google ID token (a JWT, usually 1–2 KB). Only its shape is checked here;
// utils/google.ts verifies it with Google's keys
const credential = Joi.string()
  .max(4096)
  .pattern(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  .required()
  .messages({ "string.pattern.base": '"credential" must be a Google ID token' });

export const registerSchema = Joi.object<RegisterInput>({
  name: Joi.string().trim().min(1).max(60).required(),
  email,
  password: Joi.string().min(8).max(128).required(),
});

export const loginSchema = Joi.object<LoginInput>({
  email,
  // No length rules here: login only checks against the stored hash
  password: Joi.string().max(128).required(),
  // false: the session cookie is deleted when the browser closes
  rememberMe: Joi.boolean().strict().default(true),
});

export const changePasswordSchema = Joi.object<ChangePasswordInput>({
  currentPassword: Joi.string().max(128).required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .invalid(Joi.ref("currentPassword"))
    .messages({ "any.invalid": "New password must be different from the current password" }),
});

export const googleLoginSchema = Joi.object<GoogleLoginInput>({
  credential,
  // Same as login: false makes the session cookie end when the browser closes
  rememberMe: Joi.boolean().strict().default(true),
});

// The password proves the signed-in person owns this account, so a stolen
// session alone can't attach someone else's Google account to it
export const linkGoogleSchema = Joi.object<LinkGoogleInput>({
  credential,
  password: Joi.string().max(128).required(),
});
