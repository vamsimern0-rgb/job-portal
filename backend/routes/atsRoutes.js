import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { runATS } from "../controllers/atsController.js";

const router = express.Router();

router.get("/:jobId", protect, runATS);

export default router;
