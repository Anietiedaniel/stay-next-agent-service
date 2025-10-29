// backend/routes/agentpropertiesRoute.js
import express from "express";
import {
  addProperty,
  updateProperty,
  deleteProperty,
  deleteSingleImage,
  deleteMultipleImages,
  getSingleProperty,
  getAllPropertiesWithAgents,
  getSingleAgentWithProperties,
  getPublicAgentWithProperties,
  getAllPropertiesWithFilter,
  deleteSingleVideo,
  deleteMultipleVideos,
  deleteYouTubeVideo,
} from "../controllers/agentPropertiesController.js";

import { protect } from "../middleware/authMiddleware.js";
import { propertyUpload } from "../middleware/uploadMulter.js";

const propertyRouter = express.Router();

/* ---------- 🏠 PUBLIC ROUTES ---------- */

// ✅ All properties with agents
propertyRouter.get("/all", getAllPropertiesWithAgents);

// ✅ Get a single property (public view)
propertyRouter.get("/single/:propertyId", getSingleProperty);

// ✅ Filter properties
propertyRouter.get("/filter", getAllPropertiesWithFilter);


/* ---------- 🔐 PROTECTED (Agent Only) ROUTES ---------- */

// ✅ Get logged-in agent’s own properties
propertyRouter.get("/my-properties", protect, getSingleAgentWithProperties);

// ✅ Add new property
propertyRouter.post("/add", protect, propertyUpload, addProperty);

// ✅ Update property
propertyRouter.put("/:id", protect, propertyUpload, updateProperty);

// ✅ Delete property
propertyRouter.delete("/delete/:id", protect, deleteProperty);

// ✅ Delete media
propertyRouter.delete("/delete-image", protect, deleteSingleImage);
propertyRouter.delete("/delete-images", protect, deleteMultipleImages);
propertyRouter.delete("/delete-video", protect, deleteSingleVideo);
propertyRouter.delete("/delete-videos", protect, deleteMultipleVideos);
propertyRouter.delete("/delete-youtube", protect, deleteYouTubeVideo);


/* ---------- 🧑‍💼 PUBLIC AGENT VIEW ---------- */
// ⚠️ Keep this LAST so it doesn’t catch other routes
propertyRouter.get("/:agentId", getPublicAgentWithProperties);

export default propertyRouter;
