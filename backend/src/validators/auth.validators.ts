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

const email = Joi.string().trim().lowercase().email().max(254).required();

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
