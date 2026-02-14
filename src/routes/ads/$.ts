import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ads/$")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { _splat: string } }) => {
        const path = params._splat || "";
        const filePath = join(process.cwd(), "public", "ads", path);

        try {
          const stats = statSync(filePath);

          if (!stats.isFile()) {
            return new Response("Not Found", { status: 404 });
          }

          const ext = path.split(".").pop()?.toLowerCase();
          const contentType =
            ext === "png"
              ? "image/png"
              : ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : ext === "webp"
                  ? "image/webp"
                  : "application/octet-stream";

          const stream = createReadStream(filePath);

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
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch (error) {
          return new Response("Not Found", { status: 404 });
        }
      },
    },
  },
});
