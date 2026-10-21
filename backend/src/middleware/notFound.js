const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(new AppError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
