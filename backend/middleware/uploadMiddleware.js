import multer from "multer";
import path from "path";
import { getUploadsDir } from "../utils/uploadPaths.js";

/* ===== STORAGE CONFIG ===== */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, getUploadsDir());
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

/* ===== FILE FILTER (IMAGES ONLY) ===== */
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(ext)) {
    return cb(new Error("Only image files allowed"));
  }

  cb(null, true);
};

export const uploadImage = multer({
  storage,
  fileFilter
});
