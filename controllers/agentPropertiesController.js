import Property from "../models/agentProperties.js";
import AgentProfile from "../models/agentProfile.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { formatBuffer, ensureTempFile } from "../middleware/uploadMulter.js";
import { youtube } from "../config/google.js";
import fs from "fs";
import axios from "axios";

const isLocalhost = process.env.NODE_ENV !== "production";

const AUTH_INTERNAL = isLocalhost
  ? "http://localhost:3000/api/auth/internal"
  : "https://stay-next-auth-service-4.onrender.com/api/auth/internal";


/* ============================================================
   ✅ ADD PROPERTY
   ============================================================ */
export const addProperty = async (req, res) => {
   const userId1 = req.headers["x-user-id"];
    console.log("check: ", userId1)
  try {
    const userId = req.headers["x-user-id"];
    console.log("check: ", userId)
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
    } = req.body;

    if (
      (!req.files?.images || req.files.images.length === 0) &&
      (!req.files?.videos || req.files.videos.length === 0)
    ) {
      return res.status(400).json({ message: "At least one image or video required" });
    }

    const imageUrls = [];
    if (req.files?.images) {
      for (const file of req.files.images) {
        const upload = await cloudinary.uploader.upload(formatBuffer(file).content, {
          folder: "properties/images",
        });
        imageUrls.push(upload.secure_url);
      }
    }

    const videoUrls = [];
    const youtubeVideoLinks = [];

    if (req.files?.videos) {
      for (const file of req.files.videos) {
        const upload = await cloudinary.uploader.upload(formatBuffer(file).content, {
          folder: "properties/videos",
          resource_type: "video",
        });
        videoUrls.push(upload.secure_url);

        const tmp = ensureTempFile(file);

        const yt = await youtube.videos.insert({
          part: "snippet,status",
          requestBody: {
            snippet: {
              title: title || "Property Video",
              description: features || "Real Estate Property",
              tags: ["property", "real estate"],
            },
            status: { privacyStatus: "public" },
          },
          media: { body: fs.createReadStream(tmp) },
        });

        youtubeVideoLinks.push(`https://www.youtube.com/watch?v=${yt.data.id}`);

        fs.unlinkSync(tmp);
      }
    }

    const property = await Property.create({
      agent: userId,
      title,
      location,
      price,
      duration,
      transactionType,
      type,
      bedrooms: type === "land" ? 0 : Number(bedrooms) || 0,
      toilets: type === "land" ? 0 : Number(toilets) || 0,
      area,
      features: Array.isArray(features)
        ? features
        : (features || "").split(",").map((x) => x.trim()),
      images: imageUrls,
      videos: videoUrls,
      youtubeVideos: youtubeVideoLinks,
    });

    res.status(201).json({ property, message: "Property added successfully" });
  } catch (err) {
    console.error("ADD ERROR:", err);
    res.status(500).json({ message: "Failed to add property", error: err.message });
  }
};


/* ============================================================
   ✅ UPDATE PROPERTY
   ============================================================ */
export const updateProperty = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const property = await Property.findOne({
      _id: req.params.id,
      agent: userId,
    });
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
      youtubeVideos,
    } = req.body;

    if (req.files?.images) {
      for (const file of req.files.images) {
        const upload = await cloudinary.uploader.upload(formatBuffer(file).content, {
          folder: "properties/images",
        });
        property.images.push(upload.secure_url);
      }
    }

    if (req.files?.videos) {
      for (const file of req.files.videos) {
        const upload = await cloudinary.uploader.upload(formatBuffer(file).content, {
          folder: "properties/videos",
          resource_type: "video",
        });
        property.videos.push(upload.secure_url);
      }
    }

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

    if (youtubeVideos)
      property.youtubeVideos = Array.isArray(youtubeVideos)
        ? youtubeVideos
        : youtubeVideos.split(",").map((u) => u.trim());

    await property.save();

    res.status(200).json({ message: "Property updated", property });
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
    const removed = await Property.findOneAndDelete({
      _id: req.params.id,
      agent: userId,
    });

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

    const publicId = videoUrl.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`properties/videos/${publicId}`, {
      resource_type: "video",
    });

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
    property.videos = property.videos.filter((v) => !videoUrls.includes(v));
    await property.save();

    for (const url of videoUrls) {
      const publicId = url.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`properties/videos/${publicId}`, {
        resource_type: "video",
      });
    }

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
    property.youtubeVideos = property.youtubeVideos.filter((u) => u !== youtubeUrl);
    await property.save();

    res.status(200).json({ message: "YouTube link removed", youtubeVideos: property.youtubeVideos });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete YouTube link" });
  }
};


/* ============================================================
   ✅ GET ALL PROPERTIES + MERGED AGENT INFO
   ============================================================ */
export const getAllPropertiesWithAgents = async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 }).lean();

    if (!properties.length)
      return res.status(200).json({ properties: [] });

    const agentIds = [...new Set(properties.map((p) => p.agent))];

    const profiles = await AgentProfile.find({
      userId: { $in: agentIds },
    }).lean();

    const profileMap = Object.fromEntries(
      profiles.map((p) => [String(p.userId), p])
    );

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

    const enriched = properties.map((p) => ({
      ...p,
      agent: {
        ...(userMap[p.agent] || {}),
        profile: profileMap[p.agent] || {},
      },
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
    try {
      const res = await axios.get(`${AUTH_INTERNAL}/users/${userId}`);
      userInfo = res.data;
    } catch {}

    const properties = await Property.find({ agent: userId }).lean();

    res.status(200).json({
      agent: {
        ...(userInfo || {}),
        profile,
      },
      properties,
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
    try {
      const res = await axios.get(`${AUTH_INTERNAL}/users/${profile.userId}`);
      userInfo = res.data;
    } catch {}

    const properties = await Property.find({ agent: profile.userId }).lean();

    res.status(200).json({
      agent: {
        ...(userInfo || {}),
        profile,
      },
      properties,
    });
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

    const property = await Property.findById(propertyId).lean();
    if (!property) return res.status(404).json({ message: "Property not found" });

    const profile = await AgentProfile.findOne({ userId: property.agent }).lean();

    let agentUser = null;
    try {
      const response = await axios.get(`${AUTH_INTERNAL}/users/${property.agent}`);
      agentUser = response.data;
    } catch {}

    res.status(200).json({
      property,
      agent: {
        ...(agentUser || {}),
        profile: profile || {},
      },
    });
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

    if (states) {
      const arr = states.split(",").map((s) => new RegExp(s.trim(), "i"));
      query.location = { $in: arr };
    }

    if (types) {
      const arr = types.split(",").map((t) => new RegExp(t.trim(), "i"));
      query.type = { $in: arr };
    }

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
