#!/usr/bin/env tsx

/**
 * Quick script to check video generation status
 */

import { desc } from "drizzle-orm";
import { db } from "./src/db/index.ts";
import { videos } from "./src/db/schema.ts";

console.log("📊 Checking video status...\n");

const allVideos = await db
  .select({
    id: videos.id,
    name: videos.name,
    status: videos.status,
    createdAt: videos.createdAt,
    url: videos.url,
  })
  .from(videos)
  .orderBy(desc(videos.createdAt))
  .limit(10);

console.log("Latest 10 videos:\n");
allVideos.forEach((video, idx) => {
  console.log(`${idx + 1}. ${video.name}`);
  console.log(`   Status: ${video.status}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Created: ${video.createdAt.toLocaleString()}`);
  console.log(`   URL: ${video.url || "Not generated yet"}`);
  console.log("");
});

// Check for stuck videos
const pendingVideos = allVideos.filter((v) => v.status === "pending");
const generatingVideos = allVideos.filter((v) => v.status === "generating");

if (pendingVideos.length > 0) {
  console.log(
    `⚠️ WARNING: ${pendingVideos.length} video(s) stuck in "pending" status`,
  );
  console.log("   → Is the worker running? Check Terminal 2");
  console.log("   → Run: npm run worker\n");
}

if (generatingVideos.length > 0) {
  console.log(`⏳ ${generatingVideos.length} video(s) currently generating`);
  console.log("   → Wait 30-60 seconds for completion\n");
}

console.log("✅ Done");
process.exit(0);
