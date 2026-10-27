import type { RequestHandler } from "express";
import type { Schema } from "joi";
import AppError from "../utils/AppError";

// Validates req.body, req.query and req.params against a Joi schema and replaces it with the cleaned value
const validate =
  (schema: Schema, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, { abortEarly: false });
    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join("."), message: d.message }));
      return next(new AppError(400, "VALIDATION_ERROR", "Invalid request data", details));
    }
    // defineProperty instead of assignment: Express 5 makes req.query a read-only
    // getter, and a plain assignment would silently keep the unvalidated value
    Object.defineProperty(req, source, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };

export default validate;
