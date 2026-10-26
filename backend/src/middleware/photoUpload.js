const multer = require("multer");
const AppError = require("../utils/AppError");

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Kept in memory (never written to disk) and capped before anything is read
const receive = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PHOTOS,
    fileSize: MAX_PHOTO_BYTES,
    fields: 1, // only "report"
    fieldSize: 100 * 1024,
    parts: MAX_PHOTOS + 1,
  },
}).array("photos", MAX_PHOTOS);

const invalid = (field, message) =>
  new AppError(400, "VALIDATION_ERROR", "Invalid request data", [{ field, message }]);

const describeMulterError = (err) => {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return invalid("photos", `Each photo must be ${MAX_PHOTO_BYTES / 1024 / 1024} MB or smaller`);
    // Too many files, or a file under another field name
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return err.field && err.field !== "photos"
        ? invalid(err.field, `"${err.field}" is not allowed; send files as "photos"`)
        : invalid("photos", `You can upload at most ${MAX_PHOTOS} photos`);
    default:
      return invalid("body", "Invalid form data");
  }
};

// Reads multipart/form-data: a "report" field with the report as JSON text, plus
// up to 5 "photos" files (into req.files). JSON requests pass through untouched.
const receivePhotos = (req, res, next) => {
  receive(req, res, (err) => {
    if (!err) return next();
    // Anything else multer reports here is a malformed upload from the client
    next(
      err instanceof multer.MulterError
        ? describeMulterError(err)
        : invalid("body", "Invalid form data"),
    );
  });
};

const parseReportField = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();

  const { report, ...others } = req.body;
  const [unknown] = Object.keys(others);
  if (unknown) return next(invalid(unknown, `"${unknown}" is not allowed`));
  if (typeof report !== "string") {
    return next(invalid("report", '"report" is required: the report as JSON text'));
  }
  try {
    req.body = JSON.parse(report);
  } catch {
    return next(invalid("report", '"report" must be valid JSON'));
  }
  next();
};

module.exports = { photoUpload: [receivePhotos, parseReportField], MAX_PHOTOS, MAX_PHOTO_BYTES };
