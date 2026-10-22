const Joi = require("joi");

const createReportSchema = Joi.object({
  reportType: Joi.string().valid("LOST", "FOUND").required().messages({
    "any.required": "Report type is required",
    "any.only": "Report type must be either LOST or FOUND",
  }),
  petType: Joi.string().valid("DOG", "CAT", "BIRD", "OTHER").required().messages({
    "any.required": "Pet type is required",
    "any.only": "Pet type must be DOG, CAT, BIRD, or OTHER",
  }),
  petName: Joi.string().max(100).allow(null, "").trim(),
  breed: Joi.string().max(100).allow(null, "").trim(),
  color: Joi.string().max(100).required().trim().messages({
    "any.required": "Color is required",
  }),
  size: Joi.string().valid("SMALL", "MEDIUM", "LARGE").required().messages({
    "any.required": "Size is required",
    "any.only": "Size must be SMALL, MEDIUM, or LARGE",
  }),
  gender: Joi.string().valid("MALE", "FEMALE", "UNKNOWN").required().messages({
    "any.required": "Gender is required",
    "any.only": "Gender must be MALE, FEMALE, or UNKNOWN",
  }),
  distinctiveFeatures: Joi.string().max(1000).allow(null, "").trim(),
  eventDate: Joi.date().iso().max("now").required().messages({
    "any.required": "Event date is required",
    "date.format": "Event date must be a valid ISO date",
    "date.max": "Event date cannot be in the future",
  }),
  contactInfo: Joi.string().max(255).allow(null, "").trim(),
  location: Joi.object({
    zipCode: Joi.string()
      .length(5)
      .pattern(/^\d{5}$/)
      .required()
      .messages({
        "any.required": "Zip code is required",
        "string.pattern.base": "Zip code must be a 5-digit number",
      }),
    city: Joi.string().max(100).required().trim(),
    state: Joi.string().length(2).uppercase().required().trim(),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
  }).optional(),
  photos: Joi.array()
    .items(
      Joi.string()
        .uri({ scheme: ["https"] })
        .max(2048),
    )
    .max(5)
    .optional(),
});

module.exports = {
  createReportSchema,
};
