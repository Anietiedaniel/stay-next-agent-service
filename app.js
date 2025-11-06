import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";

import router from "./routes/allRoutes.js";
import googleAuthRoutes from "./routes/googleRoute.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();

app.use(express.json());
app.use(cookieParser());

// ✅ Environment check
const isDev = process.env.NODE_ENV === "development";
console.log(`🌍 Agent Service running in ${isDev ? "DEVELOPMENT" : "PRODUCTION"} mode`);


// ============================================================================
// ✅ CORS CONFIGURATION (Express 5 Safe)
// ============================================================================

if (isDev) {
  // ✅ Allow EVERYTHING in development
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
      exposedHeaders: ["x-user-id"]
    })
  );

  // ✅ Universal OPTIONS handler (Express 5 Safe)
  app.options((req, res) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-user-id"
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    return res.sendStatus(200);
  });

  console.log("⚙️ Dev CORS Enabled: All origins allowed");

} else {
  // ✅ Production (strict)
  const allowedOrigins =
    process.env.CLIENT_URL?.split(",").map((o) => o.trim()) || [];

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server requests
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.log(`❌ Blocked by CORS: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-requested-with"
    ],
    exposedHeaders: ["x-user-id"]
  };

  app.use(cors(corsOptions));

  // ✅ Express 5-safe universal OPTIONS
  app.options((req, res) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-user-id, x-requested-with"
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    return res.sendStatus(200);
  });

  console.log("🔒 Prod CORS Enabled: Restricted mode");
}


// ============================================================================
// ✅ ROUTES
// ============================================================================
app.use("/api/agents", router);
app.use("/api/google", googleAuthRoutes);


// ============================================================================
// ✅ HEALTH CHECK
// ============================================================================
app.get("/", (req, res) =>
  res.send(
    isDev
      ? "🚧 Agent Service running in DEVELOPMENT mode"
      : "🚀 Agent Service running in PRODUCTION mode"
  )
);

export default app;
