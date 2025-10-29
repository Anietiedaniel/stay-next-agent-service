// controllers/agentVerification.js
import axios from "axios";
import AgentProfile from "../models/agentProfile.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

/**
 * 🔑 Validate user via Auth service
 */
const validateUser = async (token) => {
  if (!token) throw new Error("No token provided");

  try {
    const res = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/getMe`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.user; // must return { userId, role, isNewUser, ... }
  } catch (err) {
    console.error("❌ [validateUser] Auth validation failed:", err.response?.data || err.message);
    throw new Error("User validation failed");
  }
};

/**
 * 🧾 Submit agent verification
 */
export const submitVerification = async (req, res) => {
  console.log("🟢 [submitVerification] Triggered...");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = await validateUser(token);
    console.log("🔸 Authenticated user:", user);

    const {
      agencyName,
      agencyEmail,
      agencyPhone,
      phone,
      state,
      language,
      about,
      otherInfo,
    } = req.body;

    // Check if already submitted
    const existing = await AgentProfile.findOne({ userId: user.userId });
    if (existing && existing.status !== "rejected") {
      return res.status(400).json({ message: "Verification already submitted. Wait for admin review." });
    }

    // Upload files
    let nationalIdUrl = existing?.nationalId || "";
    let agencyLogoUrl = existing?.agencyLogo || "";

    if (req.files?.nationalId?.[0]) {
      nationalIdUrl = await uploadToCloudinary(req.files.nationalId[0], "agents/nationalIds");
      console.log("✅ National ID uploaded:", nationalIdUrl);
    }
    if (req.files?.agencyLogo?.[0]) {
      agencyLogoUrl = await uploadToCloudinary(req.files.agencyLogo[0], "agents/logos");
      console.log("✅ Agency logo uploaded:", agencyLogoUrl);
    }

    const update = {
      userId: user.userId,
      agencyName,
      agencyEmail,
      agencyPhone,
      phone,
      state,
      language: Array.isArray(language) ? language : [language],
      about,
      otherInfo,
      nationalId: nationalIdUrl,
      agencyLogo: agencyLogoUrl,
      status: "pending",
      submittedAt: new Date(),
      reviewMessage: "",
    };

    const profile = await AgentProfile.findOneAndUpdate(
      { userId: user.userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log("✅ Verification saved successfully:", profile);
    res.status(201).json({ message: "Verification submitted successfully.", profile });
  } catch (error) {
    console.error("❌ [submitVerification] Error:", error.message);
    res.status(500).json({ message: "Verification submission failed.", error: error.message });
  }
};

/**
 * 👀 Get logged-in agent’s verification info
 */
export const getMyVerification = async (req, res) => {
  console.log("🟢 [getMyVerification] Triggered...");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = await validateUser(token);
    console.log("🔸 Authenticated user:", user);

    const profile = await AgentProfile.findOne({ userId: user.userId }).select("-__v -createdAt -updatedAt");
    if (!profile) return res.status(404).json({ message: "Verification not found." });

    res.status(200).json({ profile });
  } catch (error) {
    console.error("❌ [getMyVerification] Error:", error.message);
    res.status(500).json({ message: "Failed to fetch verification.", error: error.message });
  }
};

/**
 * 📄 Get verification receipt (summary view)
 */
export const getVerificationReceipt = async (req, res) => {
  console.log("🟢 [getVerificationReceipt] Triggered...");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = await validateUser(token);
    console.log("🔸 Authenticated user:", user);

    const profile = await AgentProfile.findOne({ userId: user.userId });
    if (!profile) return res.status(404).json({ message: "No verification found." });

    const receipt = {
      agent: profile.agencyName || "N/A",
      status: profile.status,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      message: profile.reviewMessage,
      logo: profile.agencyLogo,
    };

    res.status(200).json({ message: "Verification receipt retrieved successfully.", receipt });
  } catch (error) {
    console.error("❌ [getVerificationReceipt] Error:", error.message);
    res.status(500).json({ message: "Failed to fetch verification receipt.", error: error.message });
  }
};

/**
 * ♻️ Resubmit verification (only if rejected)
 */
export const resubmitVerification = async (req, res) => {
  console.log("🟢 [resubmitVerification] Triggered...");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = await validateUser(token);
    console.log("🔸 Authenticated user:", user);

    const existing = await AgentProfile.findOne({ userId: user.userId });
    if (!existing) return res.status(404).json({ message: "No verification found to resubmit." });
    if (existing.status !== "rejected") return res.status(400).json({ message: "You can only resubmit if rejected." });

    let nationalIdUrl = existing.nationalId;
    let agencyLogoUrl = existing.agencyLogo;

    if (req.files?.nationalId?.[0]) {
      nationalIdUrl = await uploadToCloudinary(req.files.nationalId[0], "agents/nationalIds");
      console.log("✅ New national ID URL:", nationalIdUrl);
    }
    if (req.files?.agencyLogo?.[0]) {
      agencyLogoUrl = await uploadToCloudinary(req.files.agencyLogo[0], "agents/logos");
      console.log("✅ New agency logo URL:", agencyLogoUrl);
    }

    existing.agencyName = req.body.agencyName || existing.agencyName;
    existing.agencyEmail = req.body.agencyEmail || existing.agencyEmail;
    existing.agencyPhone = req.body.agencyPhone || existing.agencyPhone;
    existing.phone = req.body.phone || existing.phone;
    existing.state = req.body.state || existing.state;
    existing.language = req.body.language
      ? Array.isArray(req.body.language)
        ? req.body.language
        : [req.body.language]
      : existing.language;
    existing.about = req.body.about || existing.about;
    existing.otherInfo = req.body.otherInfo || existing.otherInfo;
    existing.nationalId = nationalIdUrl;
    existing.agencyLogo = agencyLogoUrl;
    existing.status = "pending";
    existing.reviewMessage = "";
    existing.submittedAt = new Date();

    await existing.save();
    res.status(200).json({ message: "Verification resubmitted successfully.", profile: existing });
  } catch (error) {
    console.error("❌ [resubmitVerification] Error:", error.message);
    res.status(500).json({ message: "Failed to resubmit verification.", error: error.message });
  }
};
