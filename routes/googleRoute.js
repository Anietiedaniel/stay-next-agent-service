import express from "express";
import { oauth2Client, scopes } from "../config/google.js";

const router = express.Router();

// Step A: Redirect to Google login
router.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI, // ✅ Add this
  });
  res.redirect(url);
});

// Step B: Google callback
router.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided");

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI, // ✅ Add this
    });
    console.log("TOKENS:", tokens);
    res.json(tokens);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send("Failed to get tokens");
  }
});

export default router;
