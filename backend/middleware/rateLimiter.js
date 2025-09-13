// middleware/rateLimiter.js
import rateLimit from "express-rate-limit";

// Default rate limiter: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    msg: "Too many requests from this IP, please try again later.",
  },
});

// Advanced limiter for login/signup endpoints (prevent brute-force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    msg: "Too many login/signup attempts. Please try again after 15 minutes.",
  },
});

// Usage example in server.js or routes:
// app.use("/api/auth", authLimiter);
// app.use("/api/", apiLimiter);
