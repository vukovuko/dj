import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "src",
    }),
    nitroV2Plugin({
      preset: "node-server",
      // Configure Nitro to serve static files from public/ in production
      publicAssets: [
        {
          baseURL: "/",
          dir: "public",
          maxAge: 60 * 60 * 24 * 7, // 7 days cache for static assets
        },
      ],
    }),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
});
