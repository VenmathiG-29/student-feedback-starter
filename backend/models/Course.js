// models/Course.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name is required"],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster search
courseSchema.index({ name: 1 });

export default mongoose.model("Course", courseSchema);
