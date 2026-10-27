import type { RequestHandler } from "express";
import AppError from "../utils/AppError";
import { lookupZip, ZipServiceUnavailableError } from "../services/zip.service";

export const getZipLocztion: RequestHandler = async (req, res, next) => {
  try {
    const result = await lookupZip(req.params.zip);
    if (!result) {
      return next(new AppError(404, "ZIP_NOT_FOUND", "Zip code not found"));
    }
    res.json(result);
  } catch (err) {
    if (err instanceof ZipServiceUnavailableError) {
      return next(
        new AppError(503, "ZIP_SERVICE_UNAVAILABLE", "Zip lookup temporarily unavailable"),
      );
    }
    next(err);
  }
};
