import express from "express";
import {
  getCandidates,
  getCandidateById,
  getUpcomingInterviews,
  updateStatus,
  scheduleInterview,
  cancelInterview,
  sendOffer,
  withdrawOffer,
  addRecruiterNote,
  deleteCandidate
} from "../controllers/candidateController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===============================
   GET CANDIDATES
   All roles (filtered inside controller)
================================ */
router.get(
  "/",
  protect,
  getCandidates
);
router.get("/interviews", protect, getUpcomingInterviews);
router.get("/interviews/upcoming", protect, getUpcomingInterviews);
router.get("/upcoming-interviews", protect, getUpcomingInterviews);
router.get("/:id", protect, getCandidateById);

/* ===============================
   UPDATE STATUS
   Role logic handled inside controller
================================ */
router.put(
  "/:id/status",
  protect,
  updateStatus
);

/* ===============================
   SCHEDULE INTERVIEW
   Role logic handled inside controller
================================ */
router.put(
  "/:id/schedule-interview",
  protect,
  scheduleInterview
);
router.put("/:id/cancel-interview", protect, cancelInterview);
router.put("/:id/send-offer", protect, sendOffer);
router.put("/:id/withdraw-offer", protect, withdrawOffer);

router.post(
  "/:id/notes",
  protect,
  addRecruiterNote
);
router.delete("/:id", protect, deleteCandidate);

export default router;
