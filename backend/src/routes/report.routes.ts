import express from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/report.controller";
import validate from "../middleware/validate";
import requireAuth from "../middleware/requireAuth";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import { photoUpload } from "../middleware/photoUpload";
import { createReportSchema, myReportsQuerySchema } from "../validators/report.validators";

const router = express.Router();

// Creating a report can mean processing and uploading 5 photos, so it gets the
// same budget as the auth endpoints: 20 per 15 minutes. Counted per signed-in
// user (requireAuth runs first), so people sharing a network don't share it.
const createReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => req.user!.id,
  handler: (req, res, next) =>
    next(new AppError(429, "TOO_MANY_REQUESTS", "Too many reports, please try again later")),
});

// JSON, or multipart/form-data with a "report" JSON field and up to 5 "photos" files.
// requireAuth and the limiter first, so refused requests never have files read.
router.post(
  "/",
  requireAuth,
  createReportLimiter,
  photoUpload,
  validate(createReportSchema),
  asyncHandler(controller.createReport),
);
// Keep above any future "/:id" route, or "mine" would be read as an id
router.get(
  "/mine",
  requireAuth,
  validate(myReportsQuerySchema, "query"),
  asyncHandler(controller.getMyReports),
);

export default router;
