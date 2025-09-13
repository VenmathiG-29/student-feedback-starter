// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyToken: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    // Profile details
    phone: {
      type: String,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      type: String,
      maxlength: 200,
    },
    profilePicture: {
      type: String, // Cloudinary URL
    },
  },
  { timestamps: true }
);

// Indexes for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });

export default mongoose.model("User", userSchema);
