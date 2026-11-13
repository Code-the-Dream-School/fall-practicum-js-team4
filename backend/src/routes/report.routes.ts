import express from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/report.controller";
import validate from "../middleware/validate";
import requireAuth from "../middleware/requireAuth";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import { photoUpload } from "../middleware/photoUpload";
import {
  createReportSchema,
  listReportsQuerySchema,
  myReportsQuerySchema,
  reportIdParamSchema,
  updateReportFieldsSchema,
  updateReportSchema,
} from "../validators/report.validators";

const router = express.Router();

// Creating or updating a report can mean processing and uploading 5 photos, so it gets the
// same budget as the auth endpoints: 20 per 15 minutes. Counted per signed-in
// user (requireAuth runs first), so people sharing a network don't share it.
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => req.user!.id,
  handler: (req, res, next) =>
    next(new AppError(429, "TOO_MANY_REQUESTS", "Too many reports, please try again later")),
});

// Public report listing (anonymous access allowed)
router.get("/", validate(listReportsQuerySchema, "query"), asyncHandler(controller.listReports));

// JSON, or multipart/form-data with a "report" JSON field and up to 5 "photos" files.
// requireAuth and the limiter first, so refused requests never have files read.
router.post(
  "/",
  requireAuth,
  reportLimiter,
  photoUpload,
  validate(createReportSchema),
  asyncHandler(controller.createReport),
);
// Keep above "/:id" so "mine" is never read as a report id
router.get(
  "/mine",
  requireAuth,
  validate(myReportsQuerySchema, "query"),
  asyncHandler(controller.getMyReports),
);
// Public details for an active report (anonymous access allowed)
router.get(
  "/:id/public",
  validate(reportIdParamSchema, "params"),
  asyncHandler(controller.getPublicReportById),
);

// When photos are attached, the body can have 0 or more editable fields.
// Without photos, at least one editable field must be sent.
const validateUpdateReport: express.RequestHandler = (req, res, next) => {
  const hasFiles = Boolean(Array.isArray(req.files) && req.files.length > 0);
  const schema = hasFiles ? updateReportFieldsSchema : updateReportSchema;
  return validate(schema)(req, res, next);
};

router.patch(
  "/:id",
  requireAuth,
  validate(reportIdParamSchema, "params"),
  reportLimiter,
  photoUpload,
  validateUpdateReport,
  asyncHandler(controller.updateReport),
);

export default router;
