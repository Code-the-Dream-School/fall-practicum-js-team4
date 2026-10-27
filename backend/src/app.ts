import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import helloRoutes from "./routes/hello.routes";
import authRoutes from "./routes/auth.routes";
import docsRoutes from "./routes/docs.routes";
import reportRoutes from "./routes/report.routes";
import locationRouter from "./routes/location.routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/errorHandler";
import AppError from "./utils/AppError";
import { parseTrustProxy } from "./config/trustProxy";

const app = express();

// Needed for correct req.ip (and per-user rate limits) behind a hosting proxy
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// Security & best‑practice middleware
app.use(helmet());
// credentials: true lets the browser send the auth cookie from the frontend's origin
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res, next) =>
    next(new AppError(429, "TOO_MANY_REQUESTS", "Too many requests, please try again later")),
});
app.use(limiter);

// Routes
app.use("/api/hello", helloRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/reports", reportRoutes);
app.use("api/locations", locationRouter)

// Root route
app.get("/", (req, res) => {
  res.send("Backend API is running");
});

app.use(notFound);
app.use(errorHandler);

export default app;
