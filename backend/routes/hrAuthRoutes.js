import express from "express";

import { getHrAnalytics } from "../controllers/hrAnalyticsController.js";

import {
  registerHr,
  loginHr,
  getHrProfile,
  updateHrProfile,
  uploadProfileImage,
  uploadCompanyLogo,
  changePassword,
  createSubUser,
  getCompanyTeam,
  approveAccessRequest
} from "../controllers/hrAuthController.js";

import { sendHrOtp, verifyHrOtp } from "../controllers/hrOtpController.js";
import {
  sendResetOtp,
  verifyResetOtp,
  resetPassword
} from "../controllers/hrPasswordController.js";

/* 🔥 FIXED IMPORT */
import { protectHr as protect } from "../middleware/authMiddleware.js";

import { authorize } from "../middleware/roleMiddleware.js";
import { uploadImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* ================= AUTH ================= */
router.post("/send-otp", sendHrOtp);
router.post("/verify-otp", verifyHrOtp);
router.post("/register", registerHr);
router.post("/login", loginHr);

/* ================= PASSWORD RESET ================= */
router.post("/forgot-password", sendResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

/* ================= PROFILE ================= */
router.get("/profile", protect, getHrProfile);
router.put("/profile", protect, updateHrProfile);

router.put(
  "/profile/upload-image",
  protect,
  uploadImage.single("image"),
  uploadProfileImage
);

router.put(
  "/profile/upload-logo",
  protect,
  uploadImage.single("logo"),
  uploadCompanyLogo
);

router.put(
  "/profile/change-password",
  protect,
  changePassword
);

/* ================= ENTERPRISE TEAM ================= */

router.post(
  "/create-user",
  protect,
  authorize("Founder"),
  createSubUser
);

router.get(
  "/team",
  protect,
  authorize("Founder", "HR Manager"),
  getCompanyTeam
);

router.put(
  "/approve-access/:id",
  protect,
  authorize("Founder"),
  approveAccessRequest
);

/* ================= ANALYTICS ================= */
router.get("/analytics", protect, getHrAnalytics);

export default router;