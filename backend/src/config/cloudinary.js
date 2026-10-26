const { v2: cloudinary } = require("cloudinary");

const REQUIRED = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];

// Configured on each use, not at startup, so the app and tests run without
// Cloudinary keys; only a photo upload needs them
const getCloudinary = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Photo uploads need these environment variables: ${missing.join(", ")}`);
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
};

module.exports = { getCloudinary };
