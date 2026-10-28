import Joi from "joi";

// Reusable schema for a zip code field: trims whitespace and validates the format
export const zipCodeSchema = Joi.string()
  .trim()
  .pattern(/^\d{5}$/)
  .messages({
    "string.pattern.base": "Zip code must be exactly 5 digits",
    "string.empty": "Zip code is required",
    "any.required": "Zip code is required",
  });

export const zipParamsSchema = Joi.object({
  zip: zipCodeSchema.required(),
});
