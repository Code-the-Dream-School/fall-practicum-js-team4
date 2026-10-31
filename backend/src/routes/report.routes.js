const express = require("express");
const controller = require("../controllers/report.controller");
const validate = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");
const asyncHandler = require("../utils/asyncHandler");
const { createReportSchema } = require("../validators/report.validators");

const router = express.Router();

router.get("/mine", requireAuth, asyncHandler(controller.getMyReports));

router.post("/", requireAuth, validate(createReportSchema), asyncHandler(controller.createReport));

module.exports = router;
