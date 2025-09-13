// scripts/createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "readline";
import bcrypt from "bcrypt";
import validator from "validator";
import cloudinary from "cloudinary";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { createLogger, transports, format } from "winston";

dotenv.config();

// -----------------------------
// Logger setup
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
// Cloudinary config (optional profile pic)
// -----------------------------
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -----------------------------
// Readline for interactive CLI
// -----------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const askQuestion = (question) => new Promise((resolve) => rl.question(question, resolve));

// -----------------------------
// MongoDB Connection
// -----------------------------
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/feedback";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    logger.info("✅ MongoDB Connected");
  } catch (err) {
    logger.error("❌ MongoDB connection error: " + err);
    process.exit(1);
  }
};

// -----------------------------
// Admin Creation Function
// -----------------------------
const createAdmin = async () => {
  try {
    const name = await askQuestion("Enter admin name: ");

    let email;
    while (true) {
      email = await askQuestion("Enter admin email: ");
      if (validator.isEmail(email)) break;
      console.log("❌ Invalid email format. Try again.");
    }

    let password;
    while (true) {
      password = await askQuestion("Enter admin password (min 8 chars, 1 number, 1 special char): ");
      const strongPassword = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
      if (strongPassword.test(password)) break;
      console.log("❌ Weak password. Try again.");
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      logger.error("❌ Admin with this email already exists!");
      process.exit(1);
    }

    // Optional profile picture upload
    let profilePicture = "";
    const uploadPic = await askQuestion("Do you want to upload a profile picture? (y/n): ");
    if (uploadPic.toLowerCase() === "y") {
      const picUrl = await askQuestion("Enter image URL or local path: ");
      try {
        const result = await cloudinary.v2.uploader.upload(picUrl, { folder: "admin-profiles" });
        profilePicture = result.secure_url;
        logger.info("✅ Profile picture uploaded successfully");
      } catch (err) {
        logger.error("❌ Failed to upload profile picture, skipping...");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      isBlocked: false,
      profilePicture,
    });

    // Audit Log
    await AuditLog.create({
      user: adminUser._id,
      action: "USER_CREATED",
      resourceType: "USER",
      resourceId: adminUser._id,
      details: { role: "admin", email },
    });

    logger.info("✅ Admin user created successfully!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    process.exit(0);
  } catch (err) {
    logger.error("❌ Error creating admin: " + err.message);
    process.exit(1);
  }
};

// -----------------------------
// Run Script
// -----------------------------
const run = async () => {
  await connectDB();
  await createAdmin();
};

run();
