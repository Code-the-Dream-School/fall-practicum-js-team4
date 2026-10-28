import Joi from "joi";
import type { PetGender, PetSize, PetType, ReportType } from "@prisma/client";

// Shapes after validation (empty strings for optional text are allowed and
// stored as null by the service)
export interface CreateReportInput {
  reportType: ReportType;
  petType: PetType;
  petName?: string | null;
  breed?: string | null;
  color: string;
  size: PetSize;
  gender: PetGender;
  distinctiveFeatures?: string | null;
  eventDate: Date;
  contactInfo?: string | null;
  location?: { zipCode: string; city: string; state: string };
}

export interface MyReportsQuery {
  search?: string;
}

export const createReportSchema = Joi.object<CreateReportInput>({
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
  }).optional(),
});

// Query string for GET /api/reports/mine
export const myReportsQuerySchema = Joi.object<MyReportsQuery>({
  search: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Search must be at most 100 characters",
  }),
});
