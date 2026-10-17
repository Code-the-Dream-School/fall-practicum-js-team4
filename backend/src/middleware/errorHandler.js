const AppError = require("../utils/AppError");

// eslint-disable-next-line no-unused-vars -- Express needs all 4 args to treat this as an error handler
const errorHandler = (err, req, res, next) => {
  // Body that express.json() couldn't parse
  if (err.type === "entity.parse.failed") {
    err = new AppError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  }

  if (err instanceof AppError) {
    const body = { success: false, code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  console.error(err);
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Something went wrong" });
};

module.exports = errorHandler;
