// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
