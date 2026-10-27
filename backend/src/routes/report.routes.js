const express = require("express");
const controller = require("../controllers/report.controller");
const validate = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");
const asyncHandler = require("../utils/asyncHandler");
const { createReportSchema, myReportsQuerySchema } = require("../validators/report.validators");

const router = express.Router();

router.post("/", requireAuth, validate(createReportSchema), asyncHandler(controller.createReport));
// Keep above any future "/:id" route, or "mine" would be read as an id
router.get(
  "/mine",
  requireAuth,
  validate(myReportsQuerySchema, "query"),
  asyncHandler(controller.getMyReports),
);

module.exports = router;
