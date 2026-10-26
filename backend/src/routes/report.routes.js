const express = require("express");
const controller = require("../controllers/report.controller");
const validate = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");
const asyncHandler = require("../utils/asyncHandler");
const { photoUpload } = require("../middleware/photoUpload");
const { createReportSchema, myReportsQuerySchema } = require("../validators/report.validators");

const router = express.Router();

// JSON, or multipart/form-data with a "report" JSON field and up to 5 "photos" files.
// requireAuth first, so signed-out requests are refused before any file is read.
router.post(
  "/",
  requireAuth,
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

module.exports = router;
