const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require("../validators/auth.validators");

const router = express.Router();

// Stricter limit on endpoints that check credentials, to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res, next) =>
    next(new AppError(429, "TOO_MANY_REQUESTS", "Too many attempts, please try again later")),
});

router.post("/register", authLimiter, validate(registerSchema), asyncHandler(controller.register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(controller.login));
router.patch(
  "/password",
  authLimiter,
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword),
);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

module.exports = router;
