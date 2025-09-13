// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Auth middleware
 * @param {Array} roles - Optional array of roles allowed, e.g., ['admin', 'student']
 */
const auth = (roles = []) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ msg: "User not found" });

    // Blocked user check
    if (user.isBlocked) {
      return res.status(403).json({ msg: "Account blocked by admin" });
    }

    // Role-based access
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ msg: "Access denied: insufficient permissions" });
    }

    // Optional: enforce 2FA if enabled
    if (user.twoFactorEnabled && !req.headers["x-2fa-token"]) {
      return res.status(401).json({ msg: "2FA token required" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ msg: "Invalid or expired token", error: err.message });
  }
};

export default auth;
