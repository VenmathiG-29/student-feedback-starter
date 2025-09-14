// workers/jobs.js
import AuditLog from "../models/AuditLog.js";
import nodemailer from "nodemailer";
import { createLogger, transports, format } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new transports.Console()],
});

// -----------------------------
// Email transporter (optional)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// -----------------------------
// Jobs
// -----------------------------

/**
 * Send Report Job
 * data: { adminEmail, reportPath }
 */
export const sendReportJob = async (job) => {
  try {
    const { adminEmail, reportPath } = job.data;

    logger.info(`📤 Sending report to ${adminEmail}: ${reportPath}`);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@feedbackapp.com",
      to: adminEmail,
      subject: "Feedback Report",
      text: "Please find attached the latest feedback report.",
      attachments: [{ path: reportPath }],
    });

    // Audit log
    await AuditLog.create({
      user: null, // system
      action: "REPORT_SENT",
      resourceType: "ADMIN_ACTION",
      details: { adminEmail, reportPath },
    });

    logger.info(`✅ Report sent successfully to ${adminEmail}`);
    return Promise.resolve();
  } catch (err) {
    logger.error(`❌ Failed to send report: ${err.message}`);
    throw err; // Bull will handle retry/backoff
  }
};

/**
 * Example: Notify students about feedback updates
 * data: { studentId, message }
 */
export const notifyStudentJob = async (job, io) => {
  try {
    const { studentId, message } = job.data;

    logger.info(`🔔 Notifying student ${studentId}: ${message}`);

    // Emit via Socket.IO if provided
    if (io) io.to(studentId.toString()).emit("notification", { message, timestamp: new Date() });

    await AuditLog.create({
      user: null,
      action: "STUDENT_NOTIFIED",
      resourceType: "USER",
      resourceId: studentId,
      details: { message },
    });

    return Promise.resolve();
  } catch (err) {
    logger.error(`❌ Notification failed for student ${job.data.studentId}: ${err.message}`);
    throw err;
  }
};
