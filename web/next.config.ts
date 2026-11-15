import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App personal de un solo usuario: todo se renderiza por petición, sin Cache Components.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    // La carpeta padre contiene design-system/, compartido con otros proyectos.
    root: path.join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
