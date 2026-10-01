import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Project page lives at https://keyserj.github.io/reasoning-tools/ontology-playground/
export default defineConfig({
  base: "/reasoning-tools/ontology-playground/",
  plugins: [react(), tailwindcss()],
  server: {
    // The canonical Ameliorate example lives beside the playground and is imported with ?raw.
    fs: {
      allow: [searchForWorkspaceRoot("."), "../ameliorate-v2/examples"],
    },
    // Allow sharing local server through ngrok tunnels
    allowedHosts: [".ngrok-free.app"],
  },
});
