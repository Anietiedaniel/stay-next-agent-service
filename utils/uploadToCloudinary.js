import cloudinary from "../config/cloudinaryConfig.js";

/**
 * Upload file (from multer memory buffer) directly to Cloudinary.
 */
export const uploadToCloudinary = async (file, folder) => {
  try {
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      public_id: `${Date.now()}-${file.originalname}`,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Upload to Cloudinary failed");
  }
};
