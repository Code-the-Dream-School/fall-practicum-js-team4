const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const helloRoutes = require("./routes/hello.routes");
const authRoutes = require("./routes/auth.routes");
const docsRoutes = require("./routes/docs.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");

const app = express();

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

// Root route
app.get("/", (req, res) => {
  res.send("Backend API is running");
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
