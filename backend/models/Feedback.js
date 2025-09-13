// models/Feedback.js
import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      maxlength: 1000,
    },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral", // (future ML sentiment analysis job can update this)
    },
  },
  { timestamps: true }
);

// Compound index: one feedback per student per course
feedbackSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model("Feedback", feedbackSchema);
