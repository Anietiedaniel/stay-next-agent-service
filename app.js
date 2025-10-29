import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import router from './routes/allRoutes.js'
import googleAuthRoutes from "./routes/googleRoute.js";

const __dirname = path.resolve();
const app = express();

app.use(express.json());
app.use(cookieParser());

// ✅ Allow frontend origin
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// ===== API Routes =====
app.use("/api/agents", router);
app.use("/api/google", googleAuthRoutes);


// ===== Serve frontend =====
// const frontendPath = path.join(__dirname, "../../frontend/dist");
// app.use(express.static(frontendPath));

// // ===== React Router fallback =====
// app.use((req, res, next) => {
//   if (req.method === "GET" && !req.path.startsWith("/api")) {
//     res.sendFile(path.join(frontendPath, "index.html"));
//   } else {
//     next();
//   }
// });

export default app;
