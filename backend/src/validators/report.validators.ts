import Joi from "joi";
import type { PetGender, PetSize, PetType, ReportStatus, ReportType } from "@prisma/client";

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

export interface UpdateReportInput {
  reportType?: ReportType;
  petType?: PetType;
  petName?: string | null;
  breed?: string | null;
  color?: string;
  size?: PetSize;
  gender?: PetGender;
  distinctiveFeatures?: string | null;
  eventDate?: Date;
  contactInfo?: string | null;
  status?: ReportStatus;
  location?: { zipCode: string; city: string; state: string } | null;
}

export interface ReportIdParam {
  id: number;
}

export interface MyReportsQuery {
  search?: string;
}

export interface ListReportsQuery {
  page: number;
  limit: number;
  type?: ReportType;
  status: ReportStatus;
  search?: string;
  petType?: PetType;
  size?: PetSize;
  gender?: PetGender;
  // By the date the report was created
  sort: "newest" | "oldest";
}

const locationSchema = Joi.object({
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
});

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
  location: locationSchema.optional(),
});

// URL param for routes like PATCH /api/reports/:id (capped at PostgreSQL 32-bit int max)
export const reportIdParamSchema = Joi.object<ReportIdParam>({
  id: Joi.number().integer().positive().max(2147483647).required().messages({
    "number.base": "Report id must be a positive integer",
    "number.integer": "Report id must be a positive integer",
    "number.positive": "Report id must be a positive integer",
    "number.max": "Report id must be a positive integer",
  }),
});

// Partial update: every editable field is optional, but at least one must be sent.
// Owner, id, timestamps and photos are not in the schema, so Joi rejects them.
export const updateReportSchema = Joi.object<UpdateReportInput>({
  reportType: Joi.string().valid("LOST", "FOUND").messages({
    "any.only": "Report type must be either LOST or FOUND",
  }),
  petType: Joi.string().valid("DOG", "CAT", "BIRD", "OTHER").messages({
    "any.only": "Pet type must be DOG, CAT, BIRD, or OTHER",
  }),
  petName: Joi.string().max(100).allow(null, "").trim(),
  breed: Joi.string().max(100).allow(null, "").trim(),
  color: Joi.string().max(100).trim(),
  size: Joi.string().valid("SMALL", "MEDIUM", "LARGE").messages({
    "any.only": "Size must be SMALL, MEDIUM, or LARGE",
  }),
  gender: Joi.string().valid("MALE", "FEMALE", "UNKNOWN").messages({
    "any.only": "Gender must be MALE, FEMALE, or UNKNOWN",
  }),
  distinctiveFeatures: Joi.string().max(1000).allow(null, "").trim(),
  eventDate: Joi.date().iso().max("now").messages({
    "date.format": "Event date must be a valid ISO date",
    "date.max": "Event date cannot be in the future",
  }),
  contactInfo: Joi.string().max(255).allow(null, "").trim(),
  status: Joi.string().valid("ACTIVE", "REUNITED").messages({
    "any.only": "Status must be either ACTIVE or REUNITED",
  }),
  location: locationSchema.allow(null),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update the report",
  });

// Query string for GET /api/reports/mine
export const myReportsQuerySchema = Joi.object<MyReportsQuery>({
  search: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Search must be at most 100 characters",
  }),
});

// Query string for GET /api/reports (public listing with pagination and filters)
export const listReportsQuerySchema = Joi.object<ListReportsQuery>({
  page: Joi.number().integer().min(1).max(2147483647).default(1).messages({
    "number.base": "Page must be a positive integer",
    "number.integer": "Page must be a positive integer",
    "number.min": "Page must be at least 1",
    "number.max": "Page must be a positive integer",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be an integer between 1 and 100",
    "number.integer": "Limit must be an integer between 1 and 100",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must be at most 100",
  }),
  type: Joi.string().valid("LOST", "FOUND").messages({
    "any.only": "Type must be either LOST or FOUND",
  }),
  status: Joi.string().valid("ACTIVE", "REUNITED").default("ACTIVE").messages({
    "any.only": "Status must be either ACTIVE or REUNITED",
  }),
  search: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Search must be at most 100 characters",
  }),
  petType: Joi.string().valid("DOG", "CAT", "BIRD", "OTHER").messages({
    "any.only": "Pet type must be DOG, CAT, BIRD, or OTHER",
  }),
  size: Joi.string().valid("SMALL", "MEDIUM", "LARGE").messages({
    "any.only": "Size must be SMALL, MEDIUM, or LARGE",
  }),
  gender: Joi.string().valid("MALE", "FEMALE", "UNKNOWN").messages({
    "any.only": "Gender must be MALE, FEMALE, or UNKNOWN",
  }),
  sort: Joi.string().valid("newest", "oldest").default("newest").messages({
    "any.only": "Sort must be either newest or oldest",
  }),
});
