import fs from "fs";
import path from "path";

const uploadsDir = path.resolve(process.cwd(), "uploads");

export const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  return uploadsDir;
};

export const getUploadsDir = () => ensureUploadsDir();

export const toPublicUploadPath = (file) => {
  if (!file) return "";

  const filename = path.basename(file.filename || file.path || "");
  return filename ? `/uploads/${filename}` : "";
};
