import express from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/auth.controller";
import validate from "../middleware/validate";
import requireAuth from "../middleware/requireAuth";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import { registerSchema, loginSchema, changePasswordSchema } from "../validators/auth.validators";

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

export default router;
