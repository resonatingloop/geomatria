import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // The public (GitHub Pages project-page) build is served under /geogematria/.
  // For a custom domain served at the root, change this to "/".
  base: mode === "public" ? "/geogematria/" : "/",
  // Drive the build-target flag from `--mode public` (which lives in the
  // committed `build:public` npm script) rather than an env file, so a missing
  // file can't silently leave the live toggle in the public build. PUBLIC_BUILD
  // in main.jsx reads this; it fails closed to "full" for any other mode.
  define: {
    "import.meta.env.VITE_DEPLOY_TARGET": JSON.stringify(
      mode === "public" ? "public" : "full"
    ),
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
}));
