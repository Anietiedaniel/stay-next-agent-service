import fs from "fs";
import { youtube, oauth2Client } from "./config/google.js";

async function testUpload() {
  try {
    const res = await youtube.videos.insert({
      part: ["snippet","status"],
      requestBody: {
        snippet: { title: "Test Upload", description: "Just a test" },
        status: { privacyStatus: "private" },
      },
      media: { body: fs.createReadStream("./test.mp4") }
    });
    console.log("Upload success:", res.data);
  } catch (err) {
    console.error("Upload error:", err);
  }
}

testUpload();
