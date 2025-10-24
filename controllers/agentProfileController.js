import axios from "axios";
import AgentProfile from "../models/agentProfile.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { formatBuffer } from "../middleware/uploadMulter.js"; // your multer utils

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";

/**
 * 🧾 1️⃣ Agent: Get own profile + auth info
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = await AgentProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Agent profile not found" });

    // fetch user from Auth Service
    let user = null;
    try {
      const { data } = await axios.get(`${AUTH_SERVICE_URL}/internal/users/${userId}`);
      user = data || null;
    } catch (err) {
      console.warn(`Failed to fetch Auth user ${userId}:`, err.message);
    }

    return res.status(200).json({ profile: { ...profile.toObject(), user } });
  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/**
 * 🧾 2️⃣ Get a single agent by ID (public) + auth info
 */
export const getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;

    const profile = await AgentProfile.findOne({ userId: agentId, status: "verified" });
    if (!profile) return res.status(404).json({ message: "Agent not found or not verified" });

    let user = null;
    try {
      const { data } = await axios.get(`${AUTH_SERVICE_URL}/internal/users/${agentId}`);
      user = data || null;
    } catch (err) {
      console.warn(`Failed to fetch Auth user ${agentId}:`, err.message);
    }

    return res.status(200).json({ profile: { ...profile.toObject(), user } });
  } catch (err) {
    console.error("getAgentById error:", err);
    res.status(500).json({ message: "Failed to fetch agent" });
  }
};

/**
 * ✏️ 3️⃣ Agent: Update their own profile only
 */
export const updateMyProfile = async (req, res) => {
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

    const updates = {
      agencyName,
      agencyEmail,
      agencyPhone,
      phone,
      state,
      about,
      otherInfo,
    };

    if (language) updates.language = Array.isArray(language) ? language : [language];

    // Optional file uploads
    if (req.files?.nationalId?.[0]) {
      const upload = await cloudinary.uploader.upload(
        formatBuffer(req.files.nationalId[0]).content,
        { folder: "agents/nationalIds" }
      );
      updates.nationalId = upload.secure_url;
    }

    if (req.files?.agencyLogo?.[0]) {
      const upload = await cloudinary.uploader.upload(
        formatBuffer(req.files.agencyLogo[0]).content,
        { folder: "agents/logos" }
      );
      updates.agencyLogo = upload.secure_url;
    }

    const updated = await AgentProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Profile not found" });

    return res.status(200).json({ message: "Profile updated successfully", profile: updated });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const getAllAgents = async (req, res) => {
  try {
    // 1️⃣ Fetch all approved agent profiles
    const profiles = await AgentProfile.find({ status: "approved" }).lean();
    if (!profiles.length) {
      return res.status(200).json({ count: 0, agents: [], message: "No approved agents found" });
    }

    const userIds = profiles.map((p) => p.userId);
    console.log(userIds)

    // 2️⃣ Fetch Auth users via batch endpoint
    let users = [];
    try {
      const { data } = await axios.post(`${AUTH_SERVICE_URL}/internal/users/batch`, { ids: userIds });
      users = data.users || [];
    } catch (err) {
      console.warn("Failed to fetch Auth users batch:", err.message);
    }

    // 3️⃣ Map users by ID for easy merging
    const userMap = {};
    users.forEach((u) => (userMap[u._id] = u));

    // 4️⃣ Merge profiles with user data
    const merged = profiles.map((p) => ({
      ...p,
      user: userMap[p.userId] || null,
    }));

    res.status(200).json({ count: merged.length, agents: merged });
  } catch (err) {
    console.error("getAllAgents error:", err);
    res.status(500).json({ message: "Failed to fetch agents", error: err.message });
  }
};