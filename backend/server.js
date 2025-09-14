// server.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Server } from "socket.io";
import http from "http";
import { createLogger, transports, format } from "winston";

// -----------------------------
// Routes
// -----------------------------
import { router as authRoutes } from "./routes/auth.js";
import { router as feedbackRoutes } from "./routes/feedback.js";
import { router as userRoutes } from "./routes/user.js";
import { router as adminRoutes } from "./routes/admin.js";
import { router as coursesRoutes } from "./routes/courses.js";

// -----------------------------
// Middleware
// -----------------------------
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import rateLimiter from "./middleware/rateLimiter.js";
import passportAuth from "./middleware/auth.js";

// -----------------------------
// Queue
// -----------------------------
import { queue, initQueueBoard } from "./workers/queue.js";
import User from "./models/User.js";

dotenv.config();

// -----------------------------
// Express App
// -----------------------------
const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------------
// MongoDB Connection
// -----------------------------
mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// -----------------------------
// Winston Logger
// -----------------------------
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new transports.Console()],
});

// -----------------------------
// Middleware Setup
// -----------------------------
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());
app.use(morgan("dev"));
app.use(rateLimiter); // global rate limiter

// -----------------------------
// Passport JWT Strategy
// -----------------------------
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        const user = await User.findById(jwtPayload.id).select("-password");
        if (user) return done(null, user);
        else return done(null, false);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);
app.use(passport.initialize());

// -----------------------------
// Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", coursesRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", uptime: process.uptime() });
});

// -----------------------------
// Error Handling
// -----------------------------
app.use(notFound);
app.use(errorHandler);

// -----------------------------
// HTTP + Socket.IO Server
// -----------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`❌ Client disconnected: ${socket.id}`);
  });
});
app.set("io", io);

// -----------------------------
// Queue Dashboard
// -----------------------------
initQueueBoard(app);

// Example: process jobs (can be extended)
queue.process("send-report", async (job) => {
  logger.info(`📊 Processing send-report job: ${JSON.stringify(job.data)}`);
});

queue.process("notify-student", async (job) => {
  const ioInstance = job.data.io || io;
  logger.info(`🔔 Notifying student ${job.data.studentId}`);
  // emit notification
  ioInstance.to(job.data.studentId.toString()).emit("notification", {
    message: job.data.message,
    timestamp: new Date(),
  });
});

// -----------------------------
// Start Server
// -----------------------------
server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

// -----------------------------
// Graceful Shutdown
// -----------------------------
process.on("SIGINT", async () => {
  logger.info("⚠️ SIGINT received. Closing server...");
  await mongoose.disconnect();
  server.close(() => {
    logger.info("✅ Server closed.");
    process.exit(0);
  });
});
