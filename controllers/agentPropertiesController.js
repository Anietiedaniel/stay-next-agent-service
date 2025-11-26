import Property from "../models/agentProperties.js";
import AgentProfile from "../models/agentProfile.js";
import { youtube, oauth2Client } from "../config/google.js"
import fs from "fs";
import path from "path";
import axios from "axios";
import os from "os";
import { ensureTempFile } from "../middleware/uploadMulter.js";
import fetch from "node-fetch";
import FormData from "form-data";
import crypto from "crypto";

const isLocalhost = process.env.NODE_ENV !== "production";

const AUTH_INTERNAL = isLocalhost
  ? "http://localhost:3000/api/auth/internal"
  : "https://stay-next-auth-service-4.onrender.com/api/auth/internal";

// Helper function to compute SHA256 hash of a file buffer
function getFileHash(fileBuffer) {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/* ----------------------------------------------
   ✅ Upload videos to YouTube (server-side)
------------------------------------------------*/
const uploadVideosToYouTube = async (videoFiles) => {
  const youtubeUrls = [];

  for (const file of videoFiles) {
    const tempPath = ensureTempFile(file);

    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: file.originalname,
          description: "Property video uploaded via PMS",
          tags: ["real estate", "property", "listing"],
        },
        status: { privacyStatus: "public" },
      },
      media: { body: fs.createReadStream(tempPath) },
    });

    youtubeUrls.push(`https://www.youtube.com/watch?v=${uploadResponse.data.id}`);
    fs.unlinkSync(tempPath); // cleanup
  }

  return youtubeUrls;
};

/* ----------------------------------------------
   ✅ Add Property Route

/* --------------------------------------------------------
   ✅ ADD PROPERTY (Cloudinary-only Mode)
-------------------------------------------------------- */
export const addProperty = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const {
      title,
      location,
      price,
      transactionType,
      duration,
      type,
      bedrooms,
      toilets,
      area,
      features,
      images = [],
      videos = [],
      imageHashes = [],
      videoCloudHashes = [],
    } = req.body;

    // Optional: check daily limit
    const last24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uploadCount = await Property.countDocuments({
      agent: userId,
      createdAt: { $gte: last24 },
    });
    if (uploadCount >= 5) {
      return res.status(400).json({ message: "Max 5 uploads allowed per 24h" });
    }

    // Check for duplicate Cloudinary asset IDs
    for (const hash of [...imageHashes, ...videoCloudHashes]) {
      const duplicate = await Property.findOne({
        agent: userId,
        fileHashes: hash,
      });
      if (duplicate)
        return res.status(400).json({ message: "Duplicate file detected" });
    }

    // Create property using Cloudinary URLs directly
    const property = await Property.create({
      agent: userId,
      title,
      location,
      price,
      transactionType,
      duration,
      type,
      bedrooms: type === "land" ? 0 : Number(bedrooms) || 0,
      toilets: type === "land" ? 0 : Number(toilets) || 0,
      area,
      features: Array.isArray(features)
        ? features
        : (features || "").split(",").map((x) => x.trim()),
      images, // ✅ Cloudinary image URLs directly
      videos, // ✅ Cloudinary video URLs directly
      fileHashes: [...imageHashes, ...videoCloudHashes],
    });

    return res.status(201).json({
      message: "Property created successfully (Cloudinary URLs saved)",
      property,
    });
  } catch (err) {
    console.error("ADD PROPERTY ERROR:", err);
    return res.status(500).json({
      message: "Failed to create property",
      error: err.message,
    });
  }
};

/* ============================================================
   ✅ UPLOAD VIDEO FROM CLOUDINARY TO YOUTUBE
   ============================================================ */

export const uploadVideoToYouTube = async (req, res) => {
  try {
    const { url, propertyId } = req.body;
    if (!url || !propertyId)
      return res.status(400).json({ error: "Missing video URL or property ID" });

    // 1️⃣ Download video from Cloudinary to temp folder
    const tempPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
    const writer = fs.createWriteStream(tempPath);

    const response = await axios.get(url, { responseType: "stream" });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // 2️⃣ Upload video to YouTube
    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: `Property Video ${Date.now()}`,
          description: "Uploaded from Cloudinary via backend",
          tags: ["real estate", "property"],
          categoryId: "22",
        },
        status: { privacyStatus: "unlisted" },
      },
      media: { body: fs.createReadStream(tempPath) },
    });

    // 3️⃣ Build YouTube URL
    const youtubeId = uploadResponse.data.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

    // 4️⃣ Remove temp file
    fs.unlinkSync(tempPath);

    // 5️⃣ Update property document
    const property = await Property.findById(propertyId);
    if (!property)
      return res.status(404).json({ error: "Property not found" });

    property.videos.push({
      url: youtubeUrl,
      platform: "youtube",
      uploadedAt: new Date(),
    });
    await property.save();

    // 6️⃣ Send back both
    res.status(200).json({
      success: true,
      youtubeUrl,
      property,
    });

    console.log("✅ YouTube upload successful:", youtubeUrl);
  } catch (err) {
    console.error("❌ YouTube upload error:", err);
    res.status(500).json({ error: "Failed to upload video to YouTube" });
  }
};

/* --------------------------------------------------------
   1️⃣ Create YouTube Upload Session (Frontend uploads directly)
-------------------------------------------------------- */
export const createUploadSession = async (req, res) => {

  const { title, description } = req.body;

    const response = await youtube.videos.insert(
      {
        part: ["snippet", "status"],
        requestBody: {
          snippet: { title, description },
          status: { privacyStatus: "unlisted" },
        },
        // no media here
      },
      {
        auth: oauth2Client,
        params: { uploadType: "resumable" },
      }
    );
   // Correct place for resumable upload URL
    const uploadUrl = response?.headers?.location;
    console.log("Resumable upload URL:", uploadUrl);
  try {
    const { title, description } = req.body;

    const response = await youtube.videos.insert(
      {
        part: ["snippet", "status"],
        requestBody: {
          snippet: { title, description },
          status: { privacyStatus: "unlisted" },
        },
        // no media here
      },
      {
        auth: oauth2Client,
        params: { uploadType: "resumable" },
      }
    );

    // Correct place for resumable upload URL
    const uploadUrl = response?.headers?.location;
    console.log("Resumable upload URL:", uploadUrl);
    if (!uploadUrl) throw new Error("Failed to get resumable upload URL from YouTube");

    res.json({ uploadUrl });
  } catch (error) {
    console.error("YouTube session error:", error.message);
    res.status(500).json({ error: "Failed to create upload session" });
  }
};


/* --------------------------------------------------------
   2️⃣ Save Final YouTube Video Info After Frontend Upload
-------------------------------------------------------- */
export const saveUploadedVideo = async (req, res) => {
  try {
    const { videoId, title, propertyId } = req.body;
    if (!videoId || !propertyId) return res.status(400).json({ message: "Missing videoId or propertyId" });

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    if (!property.youtubeVideos) property.youtubeVideos = [];
    property.youtubeVideos.push(youtubeUrl);
    await property.save();

    res.json({ message: "Video saved successfully", videoUrl: youtubeUrl });
  } catch (error) {
    console.error("Save video error:", error);
    res.status(500).json({ error: "Failed to save video" });
  }
};

/* --------------------------------------------------------
   3️⃣ Update Property YouTube Links (optional)
-------------------------------------------------------- */
export const updatePropertyVideos = async (req, res) => {
  try {
    const { youtubeVideos } = req.body;
    const { id } = req.params;

    const property = await Property.findByIdAndUpdate(
      id,
      { $set: { youtubeVideos } },
      { new: true }
    );

    res.json({ message: "Property updated", property });
  } catch (error) {
    console.error("Update property videos error:", error);
    res.status(500).json({ error: "Failed to update property videos" });
  }
};



/* ============================================================
   ✅ UPDATE PROPERTY WITH DUPLICATE FILE CHECK
   ============================================================ */
export const updateProperty = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const property = await Property.findOne({ _id: req.params.id, agent: userId });
    if (!property) return res.status(404).json({ message: "Property not found" });

    const {
      title,
      location,
      price,
      transactionType,
      duration,
      type,
      bedrooms,
      toilets,
      area,
      features,
      images = [],
      videos = [],
      youtubeVideos = [],
    } = req.body;

    // 1️⃣ Update basic fields
    if (title) property.title = title;
    if (location) property.location = location;
    if (price) property.price = price;
    if (transactionType) property.transactionType = transactionType;
    if (duration) property.duration = duration;
    if (type) property.type = type;
    if (area) property.area = area;

    property.bedrooms = type === "land" ? 0 : bedrooms ? Number(bedrooms) : property.bedrooms;
    property.toilets = type === "land" ? 0 : toilets ? Number(toilets) : property.toilets;

    if (features)
      property.features = Array.isArray(features)
        ? features
        : features.split(",").map((f) => f.trim());

    // 2️⃣ Handle new images & prevent duplicates
    for (const file of images) {
      const hash = file.buffer ? getFileHash(file.buffer) : file;
      if (property.fileHashes.includes(hash)) {
        return res.status(400).json({ message: "Duplicate file detected" });
      }
      property.images.push(file);
      property.fileHashes.push(hash);
    }

    // 3️⃣ Handle new videos & prevent duplicates
    for (const file of videos) {
      const hash = file.buffer ? getFileHash(file.buffer) : file;
      if (property.fileHashes.includes(hash)) {
        return res.status(400).json({ message: "Duplicate file detected" });
      }
      property.videos.push(file);
      property.fileHashes.push(hash);
    }

    // 4️⃣ Update YouTube links
    if (youtubeVideos.length) property.youtubeVideos.push(...youtubeVideos);

    await property.save();

    res.status(200).json({ message: "Property updated successfully", property });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};


/* ============================================================
   ✅ DELETE PROPERTY
   ============================================================ */
export const deleteProperty = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const removed = await Property.findOneAndDelete({ _id: req.params.id, agent: userId });

    if (!removed) return res.status(404).json({ message: "Property not found" });

    res.status(200).json({ message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};


/* ============================================================
   ✅ DELETE SINGLE IMAGE
   ============================================================ */
export const deleteSingleImage = async (req, res) => {
  try {
    const { propertyId, imageUrl } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.images = property.images.filter((img) => img !== imageUrl);
    await property.save();

    res.status(200).json({ message: "Image deleted", images: property.images });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete image" });
  }
};


/* ============================================================
   ✅ DELETE MULTIPLE IMAGES
   ============================================================ */
export const deleteMultipleImages = async (req, res) => {
  try {
    const { propertyId, imageUrls } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.images = property.images.filter((img) => !imageUrls.includes(img));
    await property.save();

    res.status(200).json({ message: "Images deleted", images: property.images });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete images" });
  }
};


/* ============================================================
   ✅ DELETE SINGLE VIDEO
   ============================================================ */
export const deleteSingleVideo = async (req, res) => {
  try {
    const { propertyId, videoUrl } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.videos = property.videos.filter((v) => v !== videoUrl);
    await property.save();

    res.status(200).json({ message: "Video deleted", videos: property.videos });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete video" });
  }
};


/* ============================================================
   ✅ DELETE MULTIPLE VIDEOS
   ============================================================ */
export const deleteMultipleVideos = async (req, res) => {
  try {
    const { propertyId, videoUrls } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.videos = property.videos.filter((v) => !videoUrls.includes(v));
    await property.save();

    res.status(200).json({ message: "Videos deleted", videos: property.videos });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete videos" });
  }
};


/* ============================================================
   ✅ DELETE YOUTUBE LINK
   ============================================================ */
export const deleteYouTubeVideo = async (req, res) => {
  try {
    const { propertyId, youtubeUrl } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.youtubeVideos = property.youtubeVideos.filter((u) => u !== youtubeUrl);
    await property.save();

    res.status(200).json({ message: "YouTube link removed", youtubeVideos: property.youtubeVideos });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete YouTube link" });
  }
};


export const getAllPropertiesWithAgents = async (req, res) => {
  try {
    // Fetch all properties
    const properties = await Property.find().sort({ createdAt: -1 }).lean();
    if (!properties.length) return res.status(200).json({ properties: [] });

    // Get unique agent IDs
    const agentIds = [...new Set(properties.map((p) => p.agent))];

    // Fetch agent profiles
    const profiles = await AgentProfile.find({ userId: { $in: agentIds } }).lean();
    const profileMap = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));

    // Fetch agent user data from AUTH_INTERNAL
    const userResults = await Promise.all(
      agentIds.map(async (id) => {
        try {
          const res = await axios.get(`${AUTH_INTERNAL}/users/${id}`);
          return { id, data: res.data };
        } catch {
          return { id, data: null };
        }
      })
    );
    const userMap = Object.fromEntries(userResults.map((u) => [u.id, u.data]));

    // Enrich properties with agent info and include `views`
    const enriched = properties.map((p) => ({
      ...p,
      views: p.views || 0, // ensure views is present
      agent: { ...(userMap[p.agent] || {}), profile: profileMap[p.agent] || {} },
    }));

    res.status(200).json({ properties: enriched });
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};


/* ============================================================
   ✅ GET LOGGED-IN AGENT + PROPERTIES
   ============================================================ */
export const getSingleAgentWithProperties = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const profile = await AgentProfile.findOne({ userId }).lean();
    if (!profile) return res.status(404).json({ message: "Agent profile not found" });

    let userInfo = null;
    try { userInfo = (await axios.get(`${AUTH_INTERNAL}/users/${userId}`)).data; } catch {}

    const properties = await Property.find({ agent: userId }).lean();

    console.log("props: ", properties)

        // Calculate total views across all properties
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);

    res.status(200).json({
      agent: { ...(userInfo || {}), profile },
      properties,
      totalViews, // new field for KPI
    });
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};


/* ============================================================
   ✅ GET PUBLIC AGENT + PROPERTIES
   ============================================================ */
export const getPublicAgentWithProperties = async (req, res) => {
  try {
    const { agentId } = req.params;
    const profile = await AgentProfile.findById(agentId).lean();
    if (!profile) return res.status(404).json({ message: "Agent profile not found" });

    let userInfo = null;
    try { userInfo = (await axios.get(`${AUTH_INTERNAL}/users/${profile.userId}`)).data; } catch {}

    const properties = await Property.find({ agent: profile.userId }).lean();

    res.status(200).json({ agent: { ...(userInfo || {}), profile }, properties });
  } catch (err) {
    res.status(500).json({ message: "Failed", error: err.message });
  }
};


/* ============================================================
   ✅ GET SINGLE PROPERTY (WITH AGENT DETAILS)
   ============================================================ */

export const getSingleProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Increment views and get updated property
    const property = await Property.findByIdAndUpdate(
      propertyId,
      { $inc: { views: 1 } }, // increment views
      { new: true, lean: true } // return updated document and plain object
    );

    if (!property) return res.status(404).json({ message: "Property not found" });

    // Get agent profile
    const profile = await AgentProfile.findOne({ userId: property.agent }).lean();

    // Get agent user info (optional)
    let agentUser = null;
    try {
      agentUser = (await axios.get(`${AUTH_INTERNAL}/users/${property.agent}`)).data;
    } catch {}

    res.status(200).json({ property, agent: { ...(agentUser || {}), profile: profile || {} } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


/* ============================================================
   ✅ FILTER PROPERTIES
   ============================================================ */
export const getAllPropertiesWithFilter = async (req, res) => {
  try {
    const { transactionType, states, types, priceRange, search } = req.query;
    const query = {};

    if (transactionType) query.transactionType = new RegExp(transactionType, "i");
    if (states) query.location = { $in: states.split(",").map((s) => new RegExp(s.trim(), "i")) };
    if (types) query.type = { $in: types.split(",").map((t) => new RegExp(t.trim(), "i")) };

    if (priceRange) {
      const parts = priceRange.replace(/[₦kM+\s]/g, "").split("-");
      if (parts.length === 2) {
        let [min, max] = parts.map(Number);
        if (priceRange.includes("k")) min *= 1000, max *= 1000;
        if (priceRange.includes("m")) min *= 1e6, max *= 1e6;
        query.price = { $gte: min, $lte: max };
      }
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { location: regex },
        { type: regex },
        { description: regex },
      ];
    }

    const properties = await Property.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ properties });
  } catch (err) {
    res.status(500).json({ message: "Failed to filter properties", error: err.message });
  }
};

 