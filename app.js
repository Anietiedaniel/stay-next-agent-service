import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import router from "./routes/allRoutes.js";
import googleAuthRoutes from "./routes/googleRoute.js";

const __dirname = path.resolve();
const app = express();

app.use(express.json());
app.use(cookieParser());

// ===== Dynamic Multi-Origin CORS Setup =====
const allowedOrigins = process.env.CLIENT_URL?.split(",").map(o => o.trim()) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like Postman or same-service calls)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ Blocked by CORS: ${origin}`);
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ===== API Routes =====
app.use("/api/agents", router);
app.use("/api/google", googleAuthRoutes);

// ===== Health check =====
app.get("/", (req, res) => {
  res.send("Agent Service is running 🚀");
});

export default app;
