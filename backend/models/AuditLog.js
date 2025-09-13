// models/AuditLog.js
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "FEEDBACK_SUBMITTED",
        "FEEDBACK_EDITED",
        "FEEDBACK_DELETED",
        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",
        "USER_BLOCKED",
        "USER_UNBLOCKED",
        "COURSE_ADDED",
        "COURSE_EDITED",
        "COURSE_DELETED",
      ],
    },
    resourceType: {
      type: String,
      enum: ["FEEDBACK", "USER", "PROFILE", "COURSE", "ADMIN_ACTION"],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    details: {
      type: Object, // Store any extra details like old/new values
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Optional: Indexes for faster queries
auditLogSchema.index({ user: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
