#!/usr/bin/env tsx

/**
 * Background Worker Process
 *
 * This script runs the Graphile Worker to process background jobs.
 * It should run alongside the main application.
 *
 * Usage:
 *   Development: npm run worker
 *   Production: node --experimental-strip-types worker.ts
 *
 * Jobs:
 *   - generate-video: Process Luma AI video generation
 */

import { startWorker } from "./src/lib/worker.ts";

process.on("uncaughtException", (err) => {
  console.error("❌ Worker uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Worker unhandled rejection:", reason);
  process.exit(1);
});

startWorker()
  .then(() => {
    console.log("✅ Worker is running and processing jobs");
  })
  .catch((error) => {
    console.error("❌ Worker failed to start:", error);
    process.exit(1);
  });
