import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multer.js"; // ✅ use your multer file here
import {
  submitVerification,
  getMyVerification,
  getVerificationReceipt,
  resubmitVerification,
} from "../controllers/agentVerificationController.js";

const router = express.Router();

router.post(
  "/submit",
  protect,
  upload.fields([
    { name: "nationalId", maxCount: 10 },
    { name: "agencyLogo", maxCount: 10 },
  ]),
  submitVerification
);

router.get("/my", protect, getMyVerification);
router.get("/receipt", protect, getVerificationReceipt);

router.post(
  "/resubmit",
  protect,
  upload.fields([
    { name: "nationalId", maxCount: 10 },
    { name: "agencyLogo", maxCount: 10 },
  ]),
  resubmitVerification
);

export default router;
