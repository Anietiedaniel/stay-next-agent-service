import express from "express";
import {
  getMyProfile,
  getAgentById,
  updateMyProfile,
  getAllAgents,
} from "../controllers/agentProfileController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMulter.js";

const router = express.Router();

// Agent self
router.get("/me", protect, getMyProfile);
router.put(
  "/me",
  protect,
  upload.fields([
    { name: "nationalId", maxCount: 1 },
    { name: "agencyLogo", maxCount: 1 },
  ]),
  updateMyProfile
);

// Public
router.get("/all", getAllAgents);
router.get("/:agentId", getAgentById);

export default router;
