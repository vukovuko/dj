import { createFileRoute } from "@tanstack/react-router";
import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";

export const Route = createFileRoute("/videos/$")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { _splat: string } }) => {
        const path = params._splat || "";
        const videoPath = join(process.cwd(), "public", "videos", path);

        console.log(`📂 Serving video file: /videos/${path}`);
        console.log(`   🗂️  Full path: ${videoPath}`);

        try {
          const stats = statSync(videoPath);

          if (!stats.isFile()) {
            console.log(`   ❌ Not a file`);
            return new Response("Not Found", { status: 404 });
          }

          console.log(`   ✓ File found, size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

          const ext = path.split(".").pop()?.toLowerCase();
          const contentType =
            ext === "mp4"
              ? "video/mp4"
              : ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : "application/octet-stream";

          console.log(`   📤 Streaming with Content-Type: ${contentType}`);

          // Create a readable stream from the file
          const stream = createReadStream(videoPath);

          // Convert Node.js stream to Web ReadableStream
          const webStream = new ReadableStream({
            start(controller) {
              stream.on("data", (chunk) => controller.enqueue(chunk));
              stream.on("end", () => controller.close());
              stream.on("error", (err) => controller.error(err));
            },
            cancel() {
              stream.destroy();
            },
          });

          return new Response(webStream, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": stats.size.toString(),
              "Accept-Ranges": "bytes",
            },
          });
        } catch (error) {
          console.error(`   ❌ File not found or error:`, error);
          return new Response("Not Found", { status: 404 });
        }
      },
    },
  },
});
