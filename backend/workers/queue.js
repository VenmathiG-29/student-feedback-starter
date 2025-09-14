// workers/queue.js
import { Queue, Worker } from "bullmq";
import nodemailer from "nodemailer";
import Redis from "ioredis";

// -----------------------------
// Redis Connection
// -----------------------------
const connection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || "",
});

// -----------------------------
// Define Queues
// -----------------------------
export const queue = {
  sendEmail: new Queue("send-email", { connection }),
  notifyAdmin: new Queue("notify-admin", { connection }),
  analytics: new Queue("analytics", { connection }),
};

// -----------------------------
// Email transporter (SMTP or Mailtrap)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// -----------------------------
// Worker: Send Emails
// -----------------------------
new Worker(
  "send-email",
  async (job) => {
    const { to, subject, text, html } = job.data;

    await transporter.sendMail({
      from: `"Student Feedback App" <no-reply@feedbackapp.com>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent to ${to}`);
  },
  { connection }
);

// -----------------------------
// Worker: Notify Admins of new feedback
// -----------------------------
new Worker(
  "notify-admin",
  async (job) => {
    const { course, rating, student } = job.data;

    // Example: send email to all admins
    const admins = ["admin1@example.com", "admin2@example.com"]; // fetch dynamically if needed
    for (const admin of admins) {
      await transporter.sendMail({
        from: `"Student Feedback App" <no-reply@feedbackapp.com>`,
        to: admin,
        subject: `New Feedback Submitted`,
        text: `${student} submitted feedback for ${course} with rating ${rating}`,
      });
    }

    console.log("Admins notified about new feedback");
  },
  { connection }
);

// -----------------------------
// Worker: Analytics Jobs
// -----------------------------
new Worker(
  "analytics",
  async (job) => {
    const { task } = job.data;

    if (task === "updateSentiment") {
      // Example: Run ML sentiment analysis (pseudo-code)
      // const feedbacks = await Feedback.find({ sentiment: "neutral" });
      // feedbacks.forEach(f => f.sentiment = predictSentiment(f.message));
      // await f.save();
      console.log("Analytics: Sentiment analysis job executed");
    }

    if (task === "updateCourseAvg") {
      // Example: calculate average rating per course
      console.log("Analytics: Course rating aggregation job executed");
    }
  },
  { connection }
);

console.log("Worker queues initialized ✅");
