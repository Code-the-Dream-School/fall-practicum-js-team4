import type { RequestHandler } from "express";
import AppError from "../utils/AppError";

const notFound: RequestHandler = (req, res, next) => {
  next(new AppError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFound;
