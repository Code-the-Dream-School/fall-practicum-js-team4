import express from "express";
import * as controller from "../controllers/report.controller";
import validate from "../middleware/validate";
import requireAuth from "../middleware/requireAuth";
import asyncHandler from "../utils/asyncHandler";
import {
  createReportSchema,
  myReportsQuerySchema,
  reportIdParamSchema,
  updateReportSchema,
} from "../validators/report.validators";

const router = express.Router();

router.post("/", requireAuth, validate(createReportSchema), asyncHandler(controller.createReport));
// Keep above "/:id" so "mine" is never read as a report id
router.get(
  "/mine",
  requireAuth,
  validate(myReportsQuerySchema, "query"),
  asyncHandler(controller.getMyReports),
);
router.patch(
  "/:id",
  requireAuth,
  validate(reportIdParamSchema, "params"),
  validate(updateReportSchema),
  asyncHandler(controller.updateReport),
);

export default router;
