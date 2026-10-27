import express from "express";
import * as controller from "../controllers/report.controller";
import validate from "../middleware/validate";
import requireAuth from "../middleware/requireAuth";
import asyncHandler from "../utils/asyncHandler";
import { createReportSchema, myReportsQuerySchema } from "../validators/report.validators";

const router = express.Router();

router.post("/", requireAuth, validate(createReportSchema), asyncHandler(controller.createReport));
// Keep above any future "/:id" route, or "mine" would be read as an id
router.get(
  "/mine",
  requireAuth,
  validate(myReportsQuerySchema, "query"),
  asyncHandler(controller.getMyReports),
);

export default router;
