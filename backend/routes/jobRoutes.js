import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  assignRecruiter,
  rebroadcastJobMatches
} from "../controllers/jobController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= JOB ROUTES ================= */

// Create Job
router.post("/", protect, createJob);

// Get Jobs (role based)
router.get("/", protect, getJobs);

// Update Job Status
router.put("/:id/status", protect, updateJobStatus);
router.get("/:id", protect, getJobById);
router.put("/:id", protect, updateJob);

// Delete Job (Founder only inside controller)
router.delete("/:id", protect, deleteJob);

// Assign Recruiter (Founder / HR Manager)
router.put("/:id/assign", protect, assignRecruiter);

// Manual match rebroadcast
router.post("/:id/rebroadcast", protect, rebroadcastJobMatches);

export default router;
