// routes/feedback.js
import express from "express";
import passport from "passport";
import Feedback from "../models/Feedback.js";
import Course from "../models/Course.js";
import { queue } from "../workers/queue.js";
import { Parser } from "json2csv";

export const router = express.Router();

// Middleware: protect routes
const auth = passport.authenticate("jwt", { session: false });

// -----------------------------
// @route   POST /api/feedback
// @desc    Student submits feedback
// -----------------------------
router.post("/", auth, async (req, res, next) => {
  try {
    const { courseId, rating, message } = req.body;

    if (!courseId || !rating) {
      return res.status(400).json({ msg: "Course and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ msg: "Course not found" });

    const feedback = new Feedback({
      course: courseId,
      student: req.user._id,
      rating,
      message,
    });

    await feedback.save();

    // Notify admins in real-time (Socket.IO)
    const io = req.app.get("io");
    io.emit("newFeedback", {
      course: course.name,
      rating,
      student: req.user.name,
    });

    // Queue job: async email to admin
    await queue.add("notify-admin", {
      course: course.name,
      rating,
      student: req.user.email,
    });

    res.status(201).json({ msg: "Feedback submitted", feedback });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   GET /api/feedback/mine?page=1&limit=5
// @desc    Student views own feedback (paginated)
// -----------------------------
router.get("/mine", auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const feedbacks = await Feedback.find({ student: req.user._id })
      .populate("course", "name")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Feedback.countDocuments({ student: req.user._id });

    res.json({ feedbacks, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   PUT /api/feedback/:id
// @desc    Student edits their own feedback
// -----------------------------
router.put("/:id", auth, async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ msg: "Feedback not found" });

    if (feedback.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const { rating, message } = req.body;
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ msg: "Rating must be 1–5" });
    }

    if (rating) feedback.rating = rating;
    if (message) feedback.message = message;
    await feedback.save();

    res.json({ msg: "Feedback updated", feedback });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   DELETE /api/feedback/:id
// @desc    Student deletes their own feedback
// -----------------------------
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ msg: "Feedback not found" });

    if (feedback.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await feedback.deleteOne();
    res.json({ msg: "Feedback deleted" });
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// Admin-only routes
// -----------------------------
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admins only" });
  }
  next();
};

// -----------------------------
// @route   GET /api/feedback
// @desc    Admin views all feedbacks with filters
// -----------------------------
router.get("/", auth, adminOnly, async (req, res, next) => {
  try {
    const { course, rating, student } = req.query;
    let filter = {};

    if (course) filter.course = course;
    if (rating) filter.rating = rating;
    if (student) filter.student = student;

    const feedbacks = await Feedback.find(filter)
      .populate("student", "name email")
      .populate("course", "name")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   GET /api/feedback/export
// @desc    Admin exports feedbacks as CSV
// -----------------------------
router.get("/export", auth, adminOnly, async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("student", "name email")
      .populate("course", "name");

    const data = feedbacks.map((f) => ({
      course: f.course?.name,
      student: f.student?.name,
      email: f.student?.email,
      rating: f.rating,
      message: f.message,
      createdAt: f.createdAt,
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("feedbacks.csv");
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

// -----------------------------
// @route   GET /api/feedback/analytics
// @desc    Admin: Average ratings per course
// -----------------------------
router.get("/analytics", auth, adminOnly, async (req, res, next) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: "$course",
          avgRating: { $avg: "$rating" },
          totalFeedback: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $project: {
          courseName: "$course.name",
          avgRating: { $round: ["$avgRating", 2] },
          totalFeedback: 1,
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    next(err);
  }
});
