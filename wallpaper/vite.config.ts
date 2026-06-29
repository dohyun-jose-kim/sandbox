import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' → relative asset paths, works at root OR any sub-path (e.g. /wallpaper/).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
