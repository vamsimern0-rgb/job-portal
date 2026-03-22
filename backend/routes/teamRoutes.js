import express from "express";
import {
  getTeamMembers,
  changeMemberRole,
  removeTeamMember
} from "../controllers/teamController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= TEAM MANAGEMENT ================= */

router.get("/", protect, getTeamMembers);
router.put("/:id/role", protect, changeMemberRole);
router.delete("/:id", protect, removeTeamMember);

export default router;
