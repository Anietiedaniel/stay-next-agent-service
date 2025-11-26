import express from "express";
import { streamToYouTube } from "../utils/youtubeUpload.js";

const router = express.Router();

router.post("/upload-youtube", async (req, res) => {
  try {
    const youtubeUrl = await streamToYouTube(req, req.headers["x-title"]);
    res.status(200).json({ youtubeUrl });
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({
      message: "YouTube upload failed",
      error: err.toString(),
    });
  }
});

export default router;
