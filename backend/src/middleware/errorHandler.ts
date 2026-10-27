import type { ErrorRequestHandler } from "express";
import { getReasonPhrase } from "http-status-codes";
import AppError from "../utils/AppError";

// Errors from Express and body-parser carry a status and sometimes a type
type HttpError = Error & { status?: number; type?: string };

interface ClientError {
  code: string;
  message: string;
}

// Codes and messages for client errors raised by Express or body-parser.
// Anything not listed gets a code derived from the HTTP reason phrase.
const CLIENT_ERRORS: Record<number, ClientError> = {
  413: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" },
  415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported request body encoding" },
};

const toClientError = (status: number): ClientError => {
  if (CLIENT_ERRORS[status]) return CLIENT_ERRORS[status];
  try {
    const reason = getReasonPhrase(status);
    return { code: reason.toUpperCase().replace(/[^A-Z]+/g, "_"), message: reason };
  } catch {
    return { code: "BAD_REQUEST", message: "Bad request" };
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs all 4 args to treat this as an error handler
const errorHandler: ErrorRequestHandler = (err: HttpError, req, res, next) => {
  // Body that express.json() couldn't parse
  if (err.type === "entity.parse.failed") {
    err = new AppError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  } else if (
    !(err instanceof AppError) &&
    err.status !== undefined &&
    err.status >= 400 &&
    err.status < 500
  ) {
    // Other client errors (e.g. a body over the express.json() limit) keep their status
    const { code, message } = toClientError(err.status);
    err = new AppError(err.status, code, message);
  }

  if (err instanceof AppError) {
    const body: { success: false; code: string; message: string; details?: AppError["details"] } = {
      success: false,
      code: err.code,
      message: err.message,
    };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  console.error(err);
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Something went wrong" });
};

export default errorHandler;
