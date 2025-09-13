// routes/user.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";
import speakeasy from "speakeasy";

import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer setup for profile uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary config (ensure env vars are set)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * @route   GET /api/user/profile
 * @desc    Get logged-in user's profile
 * @access  Private
 */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    if (req.user.isBlocked) {
      return res.status(403).json({ msg: "Account is blocked by admin." });
    }

    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile (name, phone, DOB, address, profile picture)
 * @access  Private
 */
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (req.user.isBlocked) {
        return res.status(403).json({ msg: "Account is blocked by admin." });
      }

      const { name, phone, dateOfBirth, address } = req.body;

      let profilePictureUrl = req.user.profilePicture;
      if (req.file) {
        const uploadResult = await cloudinary.v2.uploader.upload_stream(
          {
            folder: "student-profiles",
            public_id: uuidv4(),
          },
          (error, result) => {
            if (error) throw new Error(error.message);
            profilePictureUrl = result.secure_url;
          }
        );
        req.file.stream.pipe(uploadResult);
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
          name,
          phone,
          dateOfBirth,
          address,
          profilePicture: profilePictureUrl,
        },
        { new: true }
      ).select("-password");

      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  }
);

/**
 * @route   PUT /api/user/change-password
 * @desc    Change password
 * @access  Private
 */
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword.match(/^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/)) {
      return res.status(400).json({
        msg: "Password must be at least 8 characters, include 1 number & 1 special char",
      });
    }

    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   POST /api/user/2fa/setup
 * @desc    Setup Two-Factor Authentication (TOTP)
 * @access  Private
 */
router.post("/2fa/setup", authMiddleware, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ length: 20 });
    const user = await User.findById(req.user.id);

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ msg: "2FA enabled", secret: secret.otpauth_url });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   POST /api/user/2fa/disable
 * @desc    Disable Two-Factor Authentication
 * @access  Private
 */
router.post("/2fa/disable", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({ msg: "2FA disabled" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

export default router;
