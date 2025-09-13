// routes/admin.js
import express from "express";
import { Parser } from "json2csv";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Feedback from "../models/Feedback.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware: only admins allowed
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied. Admins only." });
  }
  next();
};

/**
 * @route   GET /api/admin/students
 * @desc    Get all students
 * @access  Admin
 */
router.get("/students", authMiddleware, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");
    res.json(students);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   PUT /api/admin/students/:id/block
 * @desc    Block/unblock a student
 * @access  Admin
 */
router.put("/students/:id/block", authMiddleware, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    student.isBlocked = !student.isBlocked;
    await student.save();

    res.json({ msg: `Student ${student.isBlocked ? "blocked" : "unblocked"} successfully` });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   DELETE /api/admin/students/:id
 * @desc    Delete a student
 * @access  Admin
 */
router.delete("/students/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   POST /api/admin/courses
 * @desc    Add a new course
 * @access  Admin
 */
router.post("/courses", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const course = new Course({ name, code, description });
    await course.save();

    res.json(course);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   PUT /api/admin/courses/:id
 * @desc    Edit a course
 * @access  Admin
 */
router.put("/courses/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedCourse);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   DELETE /api/admin/courses/:id
 * @desc    Delete a course
 * @access  Admin
 */
router.delete("/courses/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ msg: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   GET /api/admin/feedback
 * @desc    Get all feedback (filter by course, rating, student)
 * @access  Admin
 */
router.get("/feedback", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { course, rating, student } = req.query;
    const filter = {};

    if (course) filter.course = course;
    if (rating) filter.rating = rating;
    if (student) filter.student = student;

    const feedbacks = await Feedback.find(filter)
      .populate("course", "name code")
      .populate("student", "name email");

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   GET /api/admin/feedback/export
 * @desc    Export feedback as CSV
 * @access  Admin
 */
router.get("/feedback/export", authMiddleware, adminOnly, async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("course", "name")
      .populate("student", "name email");

    const fields = ["student.name", "student.email", "course.name", "rating", "message", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(feedbacks);

    res.header("Content-Type", "text/csv");
    res.attachment("feedback.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Dashboard analytics (counts + avg ratings)
 * @access  Admin
 */
router.get("/analytics", authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalFeedback = await Feedback.countDocuments();

    const avgRatings = await Feedback.aggregate([
      { $group: { _id: "$course", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const courseRatings = await Course.populate(avgRatings, { path: "_id", select: "name code" });

    res.json({
      totalStudents,
      totalFeedback,
      courseRatings,
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

export default router;
