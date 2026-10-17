const Joi = require("joi");

const email = Joi.string().trim().lowercase().email().max(254).required();

const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  email,
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email,
  // No length rules here: login only checks against the stored hash
  password: Joi.string().max(128).required(),
});

const googleSchema = Joi.object({
  credential: Joi.string().required(),
});

// currentPassword is optional here because Google-only users don't have one;
// the service requires it for everyone else
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().max(128),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .invalid(Joi.ref("currentPassword"))
    .messages({ "any.invalid": "New password must be different from the current password" }),
});

module.exports = { registerSchema, loginSchema, googleSchema, changePasswordSchema };
