import type { NextFunction, Request, RequestHandler, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

// Express 4 doesn't catch rejected promises, so forward them to the error handler
const asyncHandler =
  (fn: Handler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
