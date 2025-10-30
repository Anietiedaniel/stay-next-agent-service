import express from "express";
// import { protect } from "../middleware/authMiddleware.js";
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
  upload.fields([
    { name: "nationalId", maxCount: 10 },
    { name: "agencyLogo", maxCount: 10 },
  ]),
  submitVerification
);

router.get("/my", getMyVerification);
router.get("/receipt", getVerificationReceipt);

router.post(
  "/resubmit",
  upload.fields([
    { name: "nationalId", maxCount: 10 },
    { name: "agencyLogo", maxCount: 10 },
  ]),
  resubmitVerification
);

export default router;
