// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import User from "../models/User.js";
import { queue } from "../workers/queue.js";

export const router = express.Router();

// -----------------------------
// Helpers
// -----------------------------
const signToken = (payload, expiresIn = "15m") =>
  jwt.sign(payload, process.env.JWT_SECRET || "secret", { expiresIn });

const signRefreshToken = (payload, expiresIn = "7d") =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "refresh_secret", { expiresIn });

let tokenBlacklist = new Set();

// -----------------------------
// @route   POST /api/auth/signup
// -----------------------------
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ msg: "Invalid email format" });
    }
    if (!/(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password) || password.length < 8) {
      return res.status(400).json({ msg: "Password too weak" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashed,
      role: "student",
      isVerified: false,
    });
    await newUser.save();

    // Send email verification link (queued)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    newUser.verifyToken = verifyToken;
    await newUser.save();

    const verifyLink = `${process.env.CLIENT_URL}/verify/${verifyToken}`;
    await queue.add("send-email", {
      to: email,
      subject: "Verify your account",
      text: `Click here to verify your account: ${verifyLink}`,
    });

    res.status(201).json({ msg: "Signup successful. Check your email to verify account." });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   POST /api/auth/login
// -----------------------------
router.post("/login", async (req, res, next) => {
  try {
    const { email, password, token } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ msg: "Invalid credentials" });
    if (!user.isVerified) return res.status(403).json({ msg: "Email not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // If user has 2FA enabled, check token
    if (user.twoFactorEnabled) {
      if (!token) return res.status(401).json({ msg: "2FA token required" });
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
      });
      if (!verified) return res.status(401).json({ msg: "Invalid 2FA token" });
    }

    const payload = { id: user._id, role: user.role };
    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.json({
      msg: "Login successful",
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   POST /api/auth/token (refresh)
// -----------------------------
router.post("/token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.sendStatus(401);

  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "refresh_secret"
    );
    const accessToken = signToken({ id: payload.id, role: payload.role });
    res.json({ accessToken });
  } catch (err) {
    res.sendStatus(403);
  }
});

// -----------------------------
// @route   POST /api/auth/logout
// -----------------------------
router.post("/logout", (req, res) => {
  const { token } = req.body;
  if (token) tokenBlacklist.add(token); // naive in-memory blacklist
  res.json({ msg: "Logged out successfully" });
});

// -----------------------------
// @route   POST /api/auth/forgot-password
// -----------------------------
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 1000 * 60 * 15; // 15 mins
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await queue.add("send-email", {
      to: email,
      subject: "Password Reset",
      text: `Reset your password using this link: ${resetLink}`,
    });

    res.json({ msg: "Password reset email sent" });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   POST /api/auth/reset-password/:token
// -----------------------------
router.post("/reset-password/:token", async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

    const { newPassword } = req.body;
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   GET /api/auth/setup-2fa
// -----------------------------
router.get(
  "/setup-2fa",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const secret = speakeasy.generateSecret({ name: "StudentFeedbackApp" });
    const qr = await qrcode.toDataURL(secret.otpauth_url);

    const user = await User.findById(req.user._id);
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ qrCode: qr, secret: secret.base32 });
  }
);

// -----------------------------
// @route   GET /api/auth/verify/:token
// -----------------------------
router.get("/verify/:token", async (req, res) => {
  const user = await User.findOne({ verifyToken: req.params.token });
  if (!user) return res.status(400).json({ msg: "Invalid token" });

  user.isVerified = true;
  user.verifyToken = undefined;
  await user.save();

  res.json({ msg: "Email verified successfully" });
});
