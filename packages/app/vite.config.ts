import { defineConfig } from "vite"
import desktopPlugin from "./vite"

export default defineConfig({
  plugins: [desktopPlugin] as any,
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 3000,
    proxy: {
      "/.apps": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
    // sourcemap: true,
  },
})
