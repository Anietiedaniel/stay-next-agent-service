import multer from "multer";

/**
 * ✅ Memory storage for Cloudinary uploads (no local saving)
 */
const storage = multer.memoryStorage();

/**
 * 🧠 File filter for image validation
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed."),
      false
    );
  }
};

/**
 * 💾 Multer setup
 */
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
});

export default upload;
