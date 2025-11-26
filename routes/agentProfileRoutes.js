import express from "express";
import {
  getAgentsBatch,
  getMyProfile,
  getAgentById,
  getDashboardOverview,
  updateMyProfile,
  getAllAgents,
  ensureReferralCode,
  trackReferral,
  getReferralData,
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
router.get("/overview", getDashboardOverview); // <-- MOVE THIS UP
router.post("/batch", getAgentsBatch);
router.get("/all", getAllAgents);
router.get("/code", ensureReferralCode);
router.post("/track", trackReferral);
router.get("/referraldata", getReferralData);
router.get("/:agentId", getAgentById);



export default router;
