import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Separate local server: the simulated API never enters the application bundle.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  server: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
    open: false,
    watch: { ignored: ["**/.preview.local/**"] },
  },
});
