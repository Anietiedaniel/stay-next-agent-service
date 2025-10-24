import Property from "../models/agentProperties.js";
import AgentProfile from "../models/agentProfile.js"
import cloudinary from "../config/cloudinaryConfig.js";
import { formatBuffer, ensureTempFile } from "../middleware/uploadMulter.js";
import { youtube } from "../config/google.js";
import fs from "fs";
import axios from "axios";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001"; 


export const addProperty = async (req, res) => {
  try {
    const {
      title,
      location,
      price,
      transactionType, // ✅ matches your model
      duration,
      type,
      bedrooms,
      toilets,
      area,
      features,
    } = req.body;

    // --- Validation ---
    if (
      (!req.files?.images || req.files.images.length === 0) &&
      (!req.files?.videos || req.files.videos.length === 0)
    ) {
      return res.status(400).json({
        message: "At least one image or video is required",
      });
    }

    // --- Upload Images to Cloudinary ---
    const imageUrls = [];
    if (req.files?.images) {
      for (const file of req.files.images) {
        const formatted = formatBuffer(file);
        const result = await cloudinary.uploader.upload(formatted.content, {
          folder: "properties/images",
        });
        imageUrls.push(result.secure_url);
      }
    }

    // --- Upload Videos (Cloudinary + YouTube) ---
    const videoUrls = [];
    const youtubeVideoLinks = [];

    if (req.files?.videos) {
      for (const file of req.files.videos) {
        console.log("Uploading video:", file.originalname);

        // Cloudinary upload
        const formatted = formatBuffer(file);
        const cloudResult = await cloudinary.uploader.upload(formatted.content, {
          folder: "properties/videos",
          resource_type: "video",
        });
        videoUrls.push(cloudResult.secure_url);

        // --- Prepare file for YouTube ---
        const filePath = ensureTempFile(file);

        // --- Upload to YouTube ---
        const safeTitle = String(title || "Property Video").trim();
        const safeDescription = features
          ? Array.isArray(features)
            ? features.join(", ")
            : String(features).replace(/,/g, ", ")
          : `Property in ${location} priced at ₦${price}`;

        const youtubeResponse = await youtube.videos.insert({
          part: "snippet,status", // ✅ correct syntax
          requestBody: {
            snippet: {
              title: safeTitle,
              description: safeDescription,
              tags: ["real estate", "property", "house", "land"],
              categoryId: "22",
            },
            status: { privacyStatus: "public" },
          },
          media: {
            body: fs.createReadStream(filePath),
          },
        });

        const youtubeLink = `https://www.youtube.com/watch?v=${youtubeResponse.data.id}`;
        youtubeVideoLinks.push(youtubeLink);

        fs.unlinkSync(filePath); // cleanup temp file
      }
    }

    // --- Save Property in DB ---
    const property = await Property.create({
      agent: req.user.userId,
      title,
      location,
      price,
      duration,
      transactionType, // ✅ correct field
      type,
      bedrooms: type?.toLowerCase() === "land" ? 0 : Number(bedrooms) || 0,
      toilets: type?.toLowerCase() === "land" ? 0 : Number(toilets) || 0,
      area,
      features: features
        ? Array.isArray(features)
          ? features
          : String(features)
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f.length > 0)
        : [],
      images: imageUrls,
      videos: videoUrls, // ✅ Cloudinary video links
      youtubeVideos: youtubeVideoLinks, // ✅ YouTube links
    });

    res
      .status(201)
      .json({ property, message: "Property added successfully with media uploads" });
  } catch (err) {
    console.error("Error adding property:", err);
    if (err.errors) console.error("YouTube API errors:", err.errors);

    res.status(500).json({
      message: "Property upload failed",
      error: err.message || err.toString(),
    });
  }
};



export const updateProperty = async (req, res) => {
  try {
    // ✅ Find property owned by this agent
    const property = await Property.findOne({
      _id: req.params.id,
      agent: req.user.userId,
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // ✅ Extract allowed fields from req.body
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
    } = req.body || {};

    // ✅ Upload new images if any
    if (req.files?.images?.length) {
      for (const file of req.files.images) {
        const formatted = formatBuffer(file);
        const upload = await cloudinary.uploader.upload(formatted.content, {
          folder: "properties/images",
        });
        property.images.push(upload.secure_url);
      }
    }

    // ✅ Upload new videos if any
    if (req.files?.videos?.length) {
      for (const file of req.files.videos) {
        const formatted = formatBuffer(file);
        const upload = await cloudinary.uploader.upload(formatted.content, {
          folder: "properties/videos",
          resource_type: "video",
        });
        property.videos.push(upload.secure_url);
      }
    }

    // ✅ Update all other fields (only those in schema)
    if (title) property.title = title;
    if (location) property.location = location;
    if (price) property.price = price;
    if (transactionType) property.transactionType = transactionType;
    if (duration) property.duration = duration;
    if (type) property.type = type;
    if (area) property.area = area;

    // ✅ Land check (auto zero bedrooms/toilets)
    const isLand = type?.toLowerCase() === "land";
    property.bedrooms = isLand ? 0 : bedrooms ? Number(bedrooms) : property.bedrooms;
    property.toilets = isLand ? 0 : toilets ? Number(toilets) : property.toilets;

    // ✅ Features array update
    if (features) {
      property.features = Array.isArray(features)
        ? features
        : features.split(",").map((f) => f.trim());
    }

    // ✅ YouTube links update (array of URLs)
    if (youtubeVideos) {
      property.youtubeVideos = Array.isArray(youtubeVideos)
        ? youtubeVideos
        : youtubeVideos.split(",").map((url) => url.trim());
    }

    await property.save();

    res.status(200).json({
      message: "✅ Property updated successfully",
      property,
    });
  } catch (err) {
    console.error("❌ Property update error:", err);
    res.status(500).json({
      message: "Property update failed",
      error: err.message,
    });
  }
};


// --- Delete Property ---
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findOneAndDelete({
      _id: req.params.id,
      agent: req.user.userId,
    });
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    res.status(200).json({ message: "Property deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Property deletion failed" });
  }
};

// --- Delete single image ---
export const deleteSingleImage = async (req, res) => {
  const { propertyId, imageUrl } = req.body;
  if (!propertyId || !imageUrl)
    return res
      .status(400)
      .json({ message: "Property ID and image URL required" });

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.images = property.images.filter((img) => img !== imageUrl);
    await property.save();

    res
      .status(200)
      .json({ message: "Image deleted successfully", images: property.images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Delete multiple images ---
export const deleteMultipleImages = async (req, res) => {
  const { propertyId, imageUrls } = req.body;
  if (!propertyId || !imageUrls || !Array.isArray(imageUrls))
    return res
      .status(400)
      .json({ message: "Property ID and image URLs required" });

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.images = property.images.filter((img) => !imageUrls.includes(img));
    await property.save();

    res
      .status(200)
      .json({ message: "Images deleted successfully", images: property.images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Delete single Cloudinary video ---
export const deleteSingleVideo = async (req, res) => {
  const { propertyId, videoUrl } = req.body;
  if (!propertyId || !videoUrl)
    return res.status(400).json({ message: "Property ID and video URL required" });

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Remove from DB
    property.videos = property.videos.filter((vid) => vid !== videoUrl);
    await property.save();

    // Also remove from Cloudinary
    const publicId = videoUrl.split("/").slice(-1)[0].split(".")[0]; // extract id from URL
    await cloudinary.uploader.destroy(`properties/videos/${publicId}`, {
      resource_type: "video",
    });

    res.status(200).json({ message: "Video deleted successfully", videos: property.videos });
  } catch (err) {
    console.error("Delete video error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Delete multiple Cloudinary videos ---
export const deleteMultipleVideos = async (req, res) => {
  const { propertyId, videoUrls } = req.body;
  if (!propertyId || !videoUrls || !Array.isArray(videoUrls))
    return res.status(400).json({ message: "Property ID and video URLs required" });

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Remove from DB
    property.videos = property.videos.filter((vid) => !videoUrls.includes(vid));
    await property.save();

    // Remove each from Cloudinary
    for (const url of videoUrls) {
      const publicId = url.split("/").slice(-1)[0].split(".")[0];
      await cloudinary.uploader.destroy(`properties/videos/${publicId}`, {
        resource_type: "video",
      });
    }

    res.status(200).json({ message: "Videos deleted successfully", videos: property.videos });
  } catch (err) {
    console.error("Delete multiple videos error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Delete YouTube video link (DB only, not from YouTube platform) ---
export const deleteYouTubeVideo = async (req, res) => {
  const { propertyId, youtubeUrl } = req.body;
  if (!propertyId || !youtubeUrl)
    return res.status(400).json({ message: "Property ID and YouTube URL required" });

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.youtubeVideos = property.youtubeVideos.filter((yt) => yt !== youtubeUrl);
    await property.save();

    res.status(200).json({
      message: "YouTube video link removed from property",
      youtubeVideos: property.youtubeVideos,
    });
  } catch (err) {
    console.error("Delete YouTube video error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllPropertiesWithAgents = async (req, res) => {
  try {
    console.log("🚀 Fetching all properties...");

    // 1️⃣ Get all properties
    const properties = await Property.find().sort({ dateListed: -1 }).lean();
    console.log("📦 Properties found:", properties.length);
    if (!properties.length)
      return res.status(200).json({ properties: [], message: "No properties found" });

    // Log sample
    console.log("🧱 Sample property:", properties[0]);

    // 2️⃣ Extract unique agent IDs
    const agentIds = [...new Set(properties.map((p) => String(p.agent)))];
    console.log("🆔 Unique agent IDs:", agentIds);

    // 3️⃣ Fetch agent profiles
    const profiles = await AgentProfile.find({ userId: { $in: agentIds } }).lean();
    console.log("✅ Profiles found:", profiles.length);
    if (profiles.length) console.log("👤 Sample profile:", profiles[0]);

    const profileMap = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));
    console.log("🗺️ Profile map keys:", Object.keys(profileMap));

    // 4️⃣ Fetch user details from Auth Service
    console.log("🌐 Fetching user details from Auth Service...");
    const userResults = await Promise.all(
      agentIds.map(async (id) => {
        try {
          const response = await axios.get(`${AUTH_SERVICE_URL}/internal/users/${id}`);
          console.log(`✅ User fetched for ${id}`);
          return { id, data: response.data };
        } catch (err) {
          console.warn(`⚠️ Failed to fetch user ${id}:`, err.response?.status || err.message);
          return { id, data: null };
        }
      })
    );

    const userMap = Object.fromEntries(userResults.map(({ id, data }) => [id, data]));
    console.log("🗺️ User map keys:", Object.keys(userMap));

    // 5️⃣ Merge data
    const enrichedProperties = properties.map((p) => {
      const agentId = String(p.agent);
      return {
        ...p,
        agent: {
          ...(userMap[agentId] || {}),
          profile: profileMap[agentId] || {},
        },
      };
    });

    console.log("🎯 Enriched properties count:", enrichedProperties.length);
    console.log("🏡 Sample enriched property:", enrichedProperties[0]);

    res.status(200).json({ properties: enrichedProperties });
  } catch (err) {
    console.error("❌ Error fetching all properties:", err);
    res.status(500).json({
      message: "Fetching all properties failed",
      error: err.message,
    });
  }
};


export const getSingleAgentWithProperties = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ get logged-in user's ID from JWT
    console.log("🔍 Fetching details for logged-in agent ID:", userId);

    // 1️⃣ Fetch agent profile
    const profile = await AgentProfile.findOne({ userId }).lean();
    if (!profile) {
      return res.status(404).json({ message: "Agent profile not found" });
    }
    console.log("📄 Agent profile found:", profile);

    // 2️⃣ Fetch user info from Auth Service
    let userInfo = null;
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/internal/users/${userId}`);
      userInfo = response.data;
      console.log("✅ User info fetched:", userInfo?.name || userInfo?.email);
    } catch (err) {
      console.warn(`⚠️ Could not fetch user ${userId}:`, err.message);
    }

    // 3️⃣ Fetch properties for this agent
    const properties = await Property.find({ agent: userId })
      .sort({ dateListed: -1 })
      .lean();
    console.log(`🏘️ Found ${properties.length} properties for agent`);

    // 4️⃣ Combine all data
    const result = {
      agent: {
        ...(userInfo || {}),
        profile: profile || {},
      },
      properties,
    };

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error fetching logged-in agent:", err);
    res.status(500).json({
      message: "Fetching agent details failed",
      error: err.message,
    });
  }
};


export const getPublicAgentWithProperties = async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log("🔍 Public fetching agent ID:", agentId);

    // 1️⃣ Fetch profile first
    const profile = await AgentProfile.findById(agentId).lean();
    if (!profile) {
      return res.status(404).json({ message: "Agent profile not found" });
    }
    console.log("📄 Agent profile found:", profile);

    // 2️⃣ Fetch user info using userId from profile
    let userInfo = null;
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/internal/users/${profile.userId}`);
      userInfo = response.data;
      console.log("✅ User info fetched for agent:", userInfo?.name || userInfo?.email);
    } catch (err) {
      console.warn(`⚠️ Could not fetch user ${profile.userId}:`, err.message);
    }

    // 3️⃣ Fetch properties for this agent using userId
    const properties = await Property.find({ agent: profile.userId })
      .sort({ dateListed: -1 })
      .lean();
    console.log(`🏘️ Found ${properties.length} properties for agent`);

    // 4️⃣ Combine all data
    const result = {
      agent: {
        ...(userInfo || {}),
        profile: profile || {},
      },
      properties,
    };

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error fetching public agent info:", err);
    res.status(500).json({
      message: "Fetching public agent details failed",
      error: err.message,
    });
  }
};


/**
 * 👀 Get single property by ID (with agent info)
 * */

export const getSingleProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    console.log("Fetching property ID:", propertyId);

    // 1️⃣ Fetch the property
    const property = await Property.findById(propertyId).lean();
    if (!property) return res.status(404).json({ message: "Property not found" });

    console.log("Property found:", property.title);

    // 2️⃣ Fetch agent profile
    const agentProfile = await AgentProfile.findOne({ userId: property.agent }).lean();
    console.log("agentProfile here: ", agentProfile)
    if (!agentProfile) console.warn("⚠️ Agent profile not found");

    // 3️⃣ Fetch agent auth info from Auth service
    let agentUser = null;
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/internal/users/${property.agent}`);
      agentUser = response.data; // contains name, email, phone, etc.
      console.log("res: ", response)
      console.log("✅ Agent user info fetched:", agentUser?.name || agentUser?.email);
    } catch (err) {
      console.warn(`⚠️ Could not fetch user ${property.agent}:`, err.message);
    }

    // 4️⃣ Merge profile and auth info
    const agent = {
      ...(agentUser || {}),
      profile: agentProfile || {},
    };

    // 5️⃣ Return property with enriched agent info
    return res.status(200).json({
      property,
      agent,
    });
  } catch (err) {
    console.error("❌ Error fetching single property:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /agents/properties/all?transactionType=Buy
// or ?transactionType=Rent, Book, Service
// controllers/propertyController.js


// ✅ Get all properties with filters
export const getAllPropertiesWithFilter = async (req, res) => {
  try {
    const { transactionType, states, types, priceRange, search } = req.query;
    const query = {};

    // 🔹 Filter by transactionType: Buy / Rent / Book / Service
    if (transactionType) {
      query.transactionType = { $regex: new RegExp(transactionType, "i") };
    }

    // 🔹 Filter by state(s)
    if (states) {
      const stateArray = states.split(",").map((s) => s.trim());
      query.location = { $in: stateArray.map((st) => new RegExp(st, "i")) };
    }

    // 🔹 Filter by property type(s)
    if (types) {
      const typeArray = types.split(",").map((t) => t.trim());
      query.type = { $in: typeArray.map((tp) => new RegExp(tp, "i")) };
    }

    // 🔹 Filter by price range
    if (priceRange) {
      const range = priceRange.replace(/[₦kM+\s]/g, "").split("-");
      if (range.length === 2) {
        let [min, max] = range.map(Number);
        // Handle “k”, “M” suffix
        if (priceRange.toLowerCase().includes("k")) {
          min *= 1000;
          max *= 1000;
        }
        if (priceRange.toLowerCase().includes("m")) {
          min *= 1000000;
          max *= 1000000;
        }
        query.price = { $gte: min, $lte: max };
      } else if (priceRange.includes("+")) {
        let base = parseInt(priceRange);
        if (priceRange.toLowerCase().includes("m")) base *= 1000000;
        if (priceRange.toLowerCase().includes("k")) base *= 1000;
        query.price = { $gte: base };
      }
    }

    // 🔹 Search by title, description, or location
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { type: regex },
      ];
    }

    // 🔹 Fetch and sort newest first
    const properties = await Property.find(query)
      .populate("agent")
      .sort({ createdAt: -1 });

    res.status(200).json({ properties });
  } catch (error) {
    console.error("❌ Error filtering properties:", error);
    res.status(500).json({ message: "Failed to fetch filtered properties" });
  }
};
