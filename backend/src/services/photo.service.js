const sharp = require("sharp");
const { getCloudinary } = require("../config/cloudinary");
const AppError = require("../utils/AppError");

const ALLOWED_FORMATS = ["jpeg", "png", "webp"];
// Longest side after resizing: sharp on phones and laptops, ~200-400 KB as WebP
const MAX_DIMENSION = 1600;
// Refuse to decode anything bigger (a 48 MP phone photo is ~48M pixels), so a
// tiny file that claims to be gigantic can't exhaust the server's memory
const MAX_INPUT_PIXELS = 60_000_000;
const FOLDER = "pawradar/reports";

// Returns a cleaned WebP, or null if the file isn't a JPEG, PNG or WebP image.
// Re-encoding applies the phone's rotation and drops ALL metadata, including
// the GPS location phones store in photos (it could reveal a finder's home).
const prepareImage = async (buffer) => {
  const options = { limitInputPixels: MAX_INPUT_PIXELS };
  try {
    const { format } = await sharp(buffer, options).metadata();
    if (!ALLOWED_FORMATS.includes(format)) return null;
    return await sharp(buffer, options)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
};

const uploadImage = (buffer) =>
  new Promise((resolve, reject) => {
    getCloudinary()
      .uploader.upload_stream({ folder: FOLDER, resource_type: "image" }, (err, result) =>
        err ? reject(err) : resolve({ imageUrl: result.secure_url, publicId: result.public_id }),
      )
      .end(buffer);
  });

// Best effort: a failed cleanup is logged, never shown to the user
const deleteImages = async (publicIds) => {
  if (publicIds.length === 0) return;
  try {
    await getCloudinary().api.delete_resources(publicIds);
  } catch (err) {
    console.error("Could not delete uploaded photos:", publicIds, err.message);
  }
};

// Validates and cleans every file first, then uploads them all.
// Returns [{ imageUrl, publicId }] in the order the files were sent.
const storePhotos = async (files) => {
  if (files.length === 0) return [];

  const images = await Promise.all(files.map((file) => prepareImage(file.buffer)));
  const invalid = images.flatMap((image, i) =>
    image ? [] : [{ field: `photos.${i}`, message: "Photo must be a JPEG, PNG or WebP image" }],
  );
  if (invalid.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", invalid);
  }

  const results = await Promise.allSettled(images.map(uploadImage));
  const uploaded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (uploaded.length < results.length) {
    const failure = results.find((r) => r.status === "rejected").reason;
    console.error("Photo upload failed:", failure);
    await deleteImages(uploaded.map((photo) => photo.publicId));
    throw new AppError(502, "PHOTO_UPLOAD_FAILED", "Could not upload photos. Please try again.");
  }
  return uploaded;
};

module.exports = { storePhotos, deleteImages, MAX_DIMENSION };
