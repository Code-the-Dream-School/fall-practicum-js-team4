const AppError = require("../utils/AppError");

// Validates req.body against a Joi schema and replaces it with the cleaned value
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => ({ field: d.path.join("."), message: d.message }));
    return next(new AppError(400, "VALIDATION_ERROR", "Invalid request data", details));
  }
  req.body = value;
  next();
};

module.exports = validate;
