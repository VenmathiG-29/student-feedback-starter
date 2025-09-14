// workers/worker.js
import Queue from "bull";
import { createLogger, transports, format } from "winston";
import { sendReportJob, notifyStudentJob } from "./jobs.js";
import dotenv from "dotenv";

dotenv.config();

// -----------------------------
// Logger
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new transports.Console()],
});

// -----------------------------
// Queues
export const queue = new Queue("tasks", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  },
});

// -----------------------------
// Process send-report jobs
queue.process("send-report", async (job) => {
  try {
    return await sendReportJob(job);
  } catch (err) {
    logger.error("❌ send-report job failed, will retry: " + err.message);
    throw err;
  }
});

// Process notify-student jobs
queue.process("notify-student", async (job, done) => {
  try {
    const io = job.data.io; // Pass io instance if needed
    await notifyStudentJob(job, io);
    done();
  } catch (err) {
    done(err);
  }
});

// -----------------------------
// Queue Event Listeners
queue.on("completed", (job, result) => {
  logger.info(`✅ Job completed: ${job.id} - ${job.name}`);
});

queue.on("failed", (job, err) => {
  logger.error(`❌ Job failed: ${job.id} - ${job.name} - ${err.message}`);
});

queue.on("stalled", (job) => {
  logger.warn(`⚠️ Job stalled: ${job.id} - ${job.name}`);
});

// -----------------------------
// Add job example
export const addSendReportJob = (adminEmail, reportPath) => {
  queue.add("send-report", { adminEmail, reportPath }, { attempts: 3, backoff: 5000 });
};

export const addNotifyStudentJob = (studentId, message, io) => {
  queue.add("notify-student", { studentId, message, io }, { attempts: 3, backoff: 3000 });
};

// -----------------------------
// Bull-board Dashboard integration
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";

export const initQueueBoard = (app) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullAdapter(queue)],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());
};
