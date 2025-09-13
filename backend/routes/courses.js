// routes/courses.js
import express from "express";
import passport from "passport";
import Joi from "joi";

import Course from "../models/Course.js";
import AuditLog from "../models/AuditLog.js";
import { upload, uploadToCloudinary } from "../middleware/upload.js";

const router = express.Router();

// -----------------------------
// Validation Schemas
// -----------------------------
const courseSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).allow(""),
});

// -----------------------------
// Middleware: Admin only
// -----------------------------
const adminOnly = passport.authenticate("jwt", { session: false, failWithError: true });

// -----------------------------
// Routes
// -----------------------------

// GET all courses (admin)
router.get("/", adminOnly, async (req, res, next) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: courses });
  } catch (err) {
    next(err);
  }
});

// POST add new course
router.post("/", adminOnly, upload.single("image"), async (req, res, next) => {
  try {
    const { error, value } = courseSchema.validate(req.body);
    if (error) return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });

    const courseData = { ...value };
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer, "courses");
      courseData.image = imageUrl;
    }

    const course = await Course.create(courseData);

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: "COURSE_ADDED",
      resourceType: "COURSE",
      resourceId: course._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      details: { title: course.title },
    });

    res.status(201).json({ status: "success", data: course });
  } catch (err) {
    next(err);
  }
});

// PUT edit course
router.put("/:id", adminOnly, upload.single("image"), async (req, res, next) => {
  try {
    const { error, value } = courseSchema.validate(req.body);
    if (error) return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ status: "fail", msg: "Course not found" });

    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer, "courses");
      value.image = imageUrl;
    }

    Object.assign(course, value);
    await course.save();

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: "COURSE_EDITED",
      resourceType: "COURSE",
      resourceId: course._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      details: { updatedFields: value },
    });

    res.json({ status: "success", data: course });
  } catch (err) {
    next(err);
  }
});

// DELETE course
router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ status: "fail", msg: "Course not found" });

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: "COURSE_DELETED",
      resourceType: "COURSE",
      resourceId: course._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      details: { title: course.title },
    });

    res.json({ status: "success", msg: "Course deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export { router };
