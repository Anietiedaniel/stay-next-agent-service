import { google } from "googleapis";
import busboy from "busboy";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});

// STREAM from frontend → backend → YouTube
export const streamToYouTube = (req, title) => {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });

    let fileStream = null;
    let finalTitle = title || "Property Video";
    let finalDescription = "Uploaded via Stay App";

    bb.on("field", (name, val) => {
      if (name === "title") finalTitle = val;
      if (name === "description") finalDescription = val;
    });

    bb.on("file", (name, file) => {
      fileStream = file;
    });

    bb.on("close", async () => {
      if (!fileStream) return reject("No video file stream provided");

      try {
        const response = await youtube.videos.insert({
          part: ["snippet", "status"],
          requestBody: {
            snippet: {
              title: finalTitle,
              description: finalDescription,
              categoryId: "22",
            },
            status: { privacyStatus: "public" },
          },
          media: { body: fileStream },
        });

        const id = response.data.id;
        resolve(`https://www.youtube.com/watch?v=${id}`);
      } catch (err) {
        reject(err);
      }
    });

    req.pipe(bb);
  });
};
