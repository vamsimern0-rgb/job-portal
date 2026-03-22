import multer from "multer";
import path from "path";
import fs from "fs";

/* ===============================
   CREATE UPLOAD FOLDER IF NOT EXISTS
================================ */
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ===============================
   STORAGE CONFIG
================================ */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

/* ===============================
   FILE TYPE FILTER
================================ */
const fileFilter = (req, file, cb) => {
  const allowedPdf = [".pdf"];
  const allowedImages = [".jpg", ".jpeg", ".png", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();

  // Resume upload route
  if (req.baseUrl.includes("candidates")) {
    if (!allowedPdf.includes(ext)) {
      return cb(new Error("Only PDF resumes allowed"));
    }
  }

  // HR profile image / logo route
  if (req.baseUrl.includes("hr")) {
    if (!allowedImages.includes(ext)) {
      return cb(new Error("Only image files allowed"));
    }
  }

  cb(null, true);
};

/* ===============================
   MULTER EXPORT
================================ */
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
