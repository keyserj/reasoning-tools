import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Project page lives at https://keyserj.github.io/reasoning-tools/
export default defineConfig({
  base: "/reasoning-tools/",
  plugins: [react(), tailwindcss()],
});
