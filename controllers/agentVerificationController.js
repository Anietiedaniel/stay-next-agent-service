import AgentProfile from "../models/agentProfile.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

/**
 * 🧾 Submit agent verification
 */
export const submitVerification = async (req, res) => {
  console.log("🟢 [submitVerification] Triggered...");
  console.log("🔸 User from token:", req.user);
  console.log("🔸 Body received:", req.body);
  console.log("🔸 Files received:", req.files);

  try {
    const userId = req.user.userId;
    
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

    console.log("🔹 Extracted fields:", {
      userId,
      agencyName,
      agencyEmail,
      agencyPhone,
      phone,
      state,
      language,
      about,
      otherInfo,
    });

    // Check if already submitted
    console.log("🕵️ Checking if agent profile already exists...");
    const existing = await AgentProfile.findOne({ userId });
    console.log("🔍 Existing profile found:", existing);

    if (existing && existing.status !== "rejected") {
      console.warn("⚠️ Verification already submitted, skipping...");
      return res.status(400).json({
        message: "Verification already submitted. Wait for admin review.",
      });
    }

    // Uploads (Cloudinary)
    let nationalIdUrl = "";
    let agencyLogoUrl = "";

    if (req.files?.nationalId?.[0]) {
      console.log("📤 Uploading national ID to Cloudinary...");
      nationalIdUrl = await uploadToCloudinary(
        req.files.nationalId[0],
        "agents/nationalIds"
      );
      console.log("✅ National ID uploaded:", nationalIdUrl);
    }

    if (req.files?.agencyLogo?.[0]) {
      console.log("📤 Uploading agency logo to Cloudinary...");
      agencyLogoUrl = await uploadToCloudinary(
        req.files.agencyLogo[0],
        "agents/logos"
      );
      console.log("✅ Agency logo uploaded:", agencyLogoUrl);
    }

    const update = {
      userId,
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

    console.log("🧱 Creating or updating agent profile with:", update);

    const profile = await AgentProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log("✅ Verification saved successfully:", profile);

    res.status(201).json({
      message: "Verification submitted successfully.",
      profile,
    });
  } catch (error) {
    console.error("❌ [submitVerification] Error:", error);
    res.status(500).json({ message: "Verification submission failed." });
  }
};

/**
 * 👀 Get logged-in agent’s verification info
 */
export const getMyVerification = async (req, res) => {
  console.log("🟢 [getMyVerification] Triggered...");
  console.log("🔸 User from token:", req.user);

  try {
    const userId = req.user.userId;
    console.log("🔹 Fetching profile for userId:", userId);

    const profile = await AgentProfile.findOne({ userId }).select(
      "-__v -createdAt -updatedAt"
    );

    console.log("🔍 Found profile:", profile);

    if (!profile) {
      console.warn("⚠️ No verification found for userId:", userId);
      return res.status(404).json({ message: "Verification not found." });
    }

    res.status(200).json({ profile });
  } catch (error) {
    console.error("❌ [getMyVerification] Error:", error);
    res.status(500).json({ message: "Failed to fetch verification." });
  }
};

/**
 * 📄 Get verification receipt (summary view)
 */
export const getVerificationReceipt = async (req, res) => {
  console.log("🟢 [getVerificationReceipt] Triggered...");
  console.log("🔸 User from token:", req.user);

  try {
    const userId = req.user.userId;
    console.log("🔹 Fetching verification receipt for userId:", userId);

    const profile = await AgentProfile.findOne({ userId });
    console.log("🔍 Found profile:", profile);

    if (!profile) {
      console.warn("⚠️ No verification found for userId:", userId);
      return res.status(404).json({ message: "No verification found." });
    }

    const receipt = {
      agent: profile.agencyName || "N/A",
      status: profile.status,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      message: profile.reviewMessage,
      logo: profile.agencyLogo,
    };

    console.log("🧾 Constructed receipt:", receipt);

    res.status(200).json({
      message: "Verification receipt retrieved successfully.",
      receipt,
    });
  } catch (error) {
    console.error("❌ [getVerificationReceipt] Error:", error);
    res.status(500).json({ message: "Failed to fetch verification receipt." });
  }
};

/**
 * ♻️ Resubmit verification (only if rejected)
 */
export const resubmitVerification = async (req, res) => {
  console.log("🟢 [resubmitVerification] Triggered...");
  console.log("🔸 User from token:", req.user);
  console.log("🔸 Body received:", req.body);
  console.log("🔸 Files received:", req.files);

  try {
    const userId = req.user.userId;
    console.log("🔹 Checking for existing verification...");
    const existing = await AgentProfile.findOne({ userId });
    console.log("🔍 Existing profile:", existing);

    if (!existing) {
      console.warn("⚠️ No verification found to resubmit for user:", userId);
      return res.status(404).json({ message: "No verification found to resubmit." });
    }

    if (existing.status !== "rejected") {
      console.warn("⚠️ Attempt to resubmit when status is:", existing.status);
      return res.status(400).json({ message: "You can only resubmit if rejected." });
    }

    let nationalIdUrl = existing.nationalId;
    let agencyLogoUrl = existing.agencyLogo;

    if (req.files?.nationalId?.[0]) {
      console.log("📤 Re-uploading national ID...");
      nationalIdUrl = await uploadToCloudinary(
        req.files.nationalId[0],
        "agents/nationalIds"
      );
      console.log("✅ New national ID URL:", nationalIdUrl);
    }

    if (req.files?.agencyLogo?.[0]) {
      console.log("📤 Re-uploading agency logo...");
      agencyLogoUrl = await uploadToCloudinary(
        req.files.agencyLogo[0],
        "agents/logos"
      );
      console.log("✅ New agency logo URL:", agencyLogoUrl);
    }

    console.log("🧱 Updating existing verification with new data...");
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

    console.log("📝 Final data to save:", existing);

    await existing.save();
    console.log("✅ Resubmission saved successfully:", existing);

    res.status(200).json({
      message: "Verification resubmitted successfully.",
      profile: existing,
    });
  } catch (error) {
    console.error("❌ [resubmitVerification] Error:", error);
    res.status(500).json({ message: "Failed to resubmit verification." });
  }
};
