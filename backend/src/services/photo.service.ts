import sharp from "sharp";
import { getCloudinary } from "../config/cloudinary";
import AppError from "../utils/AppError";

const ALLOWED_FORMATS = ["jpeg", "png", "webp"];
// Longest side after resizing: sharp on phones and laptops, ~200-400 KB as WebP
export const MAX_DIMENSION = 1600;
// Decoding needs ~3-4 bytes per pixel whatever the file size, so a small file
// can expand to hundreds of MB. 25 MP (~100 MB decoded) still fits normal phone
// photos, including 24 MP iPhones (5712x4284), but not 48-200 MP "high resolution"
// camera modes. Photos are decoded one at a time, so this is the peak per request.
export const MAX_INPUT_PIXELS = 25_000_000;
const FOLDER = "pawradar/reports";

// What's saved in PetPhoto for each uploaded image
export interface StoredPhoto {
  imageUrl: string;
  publicId: string;
}

const NOT_AN_IMAGE = "Photo must be a JPEG, PNG or WebP image";
const DAMAGED = "Photo file is damaged and can't be read";
const TOO_LARGE = `Photo is too large (max ${MAX_INPUT_PIXELS / 1_000_000} megapixels)`;

// Sorts a sharp error into a problem with the uploaded file (a message for the
// user, sent as 400) or null: a problem on our side (out of memory, a library
// bug...), which is rethrown and becomes a logged 500.
const describeFileError = (err: unknown): string | null => {
  const message = (err as Error).message;
  if (/unsupported image format|Input Buffer is empty/i.test(message)) return NOT_AN_IMAGE;
  // Broken data: in the header, or found by libvips' image readers while decoding,
  // e.g. "VipsJpeg: premature end of JPEG image", "vipspng: libpng read error"
  if (/corrupt header|^(VipsJpeg|vipspng|VipsWebp|webp):/i.test(message)) return DAMAGED;
  return null;
};

// A cleaned WebP, or the reason the file was refused
type Prepared = { image: Buffer } | { error: string };

// Re-encoding applies the phone's rotation and drops ALL metadata, including
// the GPS location phones store in photos (it could reveal a finder's home).
const prepareImage = async (buffer: Buffer): Promise<Prepared> => {
  // limitInputPixels is a backstop; the size check below gives a clear message
  const options = { limitInputPixels: MAX_INPUT_PIXELS };
  try {
    // metadata() reads only the file header: nothing is decoded yet. No pixel
    // limit here, or sharp would reject big images before we can say why.
    const { format, width, height } = await sharp(buffer, {
      limitInputPixels: false,
    }).metadata();
    if (!ALLOWED_FORMATS.includes(format as string)) return { error: NOT_AN_IMAGE };
    // JPEG, PNG and WebP headers always include the dimensions
    if (width! * height! > MAX_INPUT_PIXELS) return { error: TOO_LARGE };
    const image = await sharp(buffer, options)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    return { image };
  } catch (err) {
    const reason = describeFileError(err);
    if (reason) return { error: reason };
    throw err;
  }
};

const uploadImage = (buffer: Buffer) =>
  new Promise<StoredPhoto>((resolve, reject) => {
    getCloudinary()
      .uploader.upload_stream({ folder: FOLDER, resource_type: "image" }, (err, result) =>
        // Cloudinary always sends a result when there's no error
        err ? reject(err) : resolve({ imageUrl: result!.secure_url, publicId: result!.public_id }),
      )
      .end(buffer);
  });

// Best effort: a failed cleanup is logged, never shown to the user
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  if (publicIds.length === 0) return;
  try {
    await getCloudinary().api.delete_resources(publicIds);
  } catch (err) {
    console.error("Could not delete uploaded photos:", publicIds, (err as Error).message);
  }
};

// Validates and cleans every file first, then uploads them all.
// Returns the stored photos in the order the files were sent.
export const storePhotos = async (files: Express.Multer.File[]): Promise<StoredPhoto[]> => {
  if (files.length === 0) return [];

  // One at a time, not in parallel: decoding is the memory-heavy step, so the
  // peak stays at one photo instead of five
  const prepared: Prepared[] = [];
  for (const file of files) {
    prepared.push(await prepareImage(file.buffer));
  }
  const invalid = prepared.flatMap((result, i) =>
    "error" in result ? [{ field: `photos.${i}`, message: result.error }] : [],
  );
  if (invalid.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", invalid);
  }

  // Every file is a cleaned image here (checked just above); uploads of the
  // small WebPs can run in parallel
  const images = prepared.map((result) => (result as { image: Buffer }).image);
  const results = await Promise.allSettled(images.map(uploadImage));
  const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (uploaded.length < results.length) {
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected")!;
    console.error("Photo upload failed:", failure.reason);
    await deleteImages(uploaded.map((photo) => photo.publicId));
    throw new AppError(502, "PHOTO_UPLOAD_FAILED", "Could not upload photos. Please try again.");
  }
  return uploaded;
};
