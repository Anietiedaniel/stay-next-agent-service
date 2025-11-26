import axios from "axios";
import AgentProfile from "../models/agentProfile.js";
import Property from "../models/agentProperties.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { formatBuffer } from "../middleware/uploadMulter.js"; // your multer utils

const isLocalhost = process.env.NODE_ENV !== "production";

const AUTH_INTERNAL = isLocalhost
  ? "http://localhost:3000/api/auth/internal"
  : "https://stay-next-auth-service-4.onrender.com/api/auth/internal";

/**
 * 🧾 1️⃣ Agent: Get own profile + auth info
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    const profile = await AgentProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Agent profile not found" });

    // fetch user from Auth Service
    let user = null;
    try {
      const { data } = await axios.get(`${AUTH_INTERNAL}/internal/users/${userId}`);
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
      const { data } = await axios.get(`${AUTH_INTERNAL}/internal/users/${agentId}`);
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
    const userId = req.headers["x-user-id"];
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
      const { data } = await axios.post(`${AUTH_INTERNAL}/internal/users/batch`, { ids: userIds });
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


 export const getDashboardOverview = async (req, res) => {
  try {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ message: "User ID missing" });

  // Fetch agent profile
  const profile = await AgentProfile.findOne({ userId }).lean();
  if (!profile) return res.status(404).json({ message: "Agent profile not found" });

  // Fetch user info from auth service
  let userInfo = null;
  try {
  const response = await axios.get(`${AUTH_INTERNAL}/users/${userId}`);
  userInfo = response.data;
  } catch (err) {
  console.warn("Could not fetch user info from auth service", err.message);
  }

  // Aggregate property stats
  const properties = await Property.find({ agent: userId }).lean();
  const totalProperties = properties.length;
  const soldProperties = properties.filter(p => p.status === "sold").length || 0;
  const rentedProperties = properties.filter(p => p.status === "rented").length || 0;

  res.status(200).json({
  agent: { ...userInfo, profile },
  stats: {
  totalProperties,
  soldProperties,
  rentedProperties,
  recentSales: profile.sales.recentSales || [],
  recentRented: profile.rented.recentRented || [],
  recentBooked: profile.booked.recentBooked || [],
  },
  });
  } catch (err) {
  console.error("Dashboard overview error:", err);
  res.status(500).json({ message: "Failed to fetch dashboard overview", error: err.message });
  }
  };

 export const ensureReferralCode = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const profile = await AgentProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    if (!profile.referral.code) {
      profile.referral.code = `${userId.toString().slice(-6)}${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;
      await profile.save();
    }

    res.status(200).json({ code: profile.referral.code });
  } catch (err) {
    console.error("ensureReferralCode error:", err);
    res.status(500).json({ message: "Failed", error: err.message });
  }
};

/**
 * Track referral immediately after registration, irrespective of role
 */
export const trackReferral = async (req, res) => {
  try {
    const { refCode, newUserId } = req.body;

    console.log("Tracking referral:", refCode, newUserId );

    if (!refCode || !newUserId)
      return res.status(400).json({ message: "Referral code or user missing" });

    const referrer = await AgentProfile.findOne({ "referral.code": refCode });
    if (!referrer)
      return res.status(404).json({ message: "Invalid referral code" });

    // Prevent double tracking
    const alreadyReferred = referrer.referral.referredUsers.some(
      (u) => String(u.userId) === String(newUserId)
    );

    if (alreadyReferred) {
      return res.status(200).json({
        message: "Referral already tracked.",
        rewardAdded: false,
      });
    }

    // Reward amount (optional)
    const reward = 500;

    // Add referred user
    referrer.referral.totalEarnings += reward;
    referrer.referral.referredUsers.push({
      userId: newUserId,
      reward,
      date: new Date(),
    });

    await referrer.save();

    res.status(200).json({
      message: "Referral tracked successfully",
      reward,
      rewardAdded: true,
    });
  } catch (err) {
    console.error("trackReferral error:", err);
    res.status(500).json({ message: "Failed", error: err.message });
  }
};

/**
 * Get referral data + user info
 */
export const getReferralData = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const profile = await AgentProfile.findOne({ userId }).lean();
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const referredUserIds = profile.referral.referredUsers.map(u => u.userId);

    console.log("refusers: ", referredUserIds)

    let users = [];
    if (referredUserIds.length) {
      try {
        const { data } = await axios.post(`${AUTH_INTERNAL}/users/batch`, { ids: referredUserIds });
        users = data.users || [];
      } catch (err) {
        console.warn("Failed to fetch referred users from Auth Service", err.message);
      }
    }

    const referredUsers = profile.referral.referredUsers.map(r => ({
      ...r,
      user: users.find(u => u._id === r.userId.toString()) || null
    }));

    res.status(200).json({
      code: profile.referral.code,
      totalEarnings: profile.referral.totalEarnings,
      totalReferrals: profile.referral.referredUsers.length,
      referredUsers
    });
  } catch (err) {
    console.error("getReferralData error:", err);
    res.status(500).json({ message: "Failed", error: err.message });
  }
};


/**
 * Get multiple agents by their IDs (batch)
 */
export const getAgentsBatch = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No agent IDs provided" });
    }

    const agents = await AgentProfile.find({ _id: { $in: ids } })
      .select("_id userId agencyName agencyEmail agencyPhone profileImage coverImage")
      .lean();

    res.status(200).json({ agents });
  } catch (err) {
    console.error("Batch agent fetch error:", err);
    res.status(500).json({ message: "Failed to fetch agents", error: err.message });
  }
};
