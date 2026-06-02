import { defineConfig, loadEnv } from "vite"
import desktopPlugin from "./vite"


console.log('build app with OPENCODE_VERSION ', process.env["OPENCODE_VERSION"])
console.log('build app with OPENCODE_HOME_VIEW ', process.env["OPENCODE_HOME_VIEW"])

export default defineConfig(({mode})=> {
  const env = loadEnv(mode, process.cwd(), "")
  const homeViewValue = JSON.stringify(env.OPENCODE_HOME_VIEW || "")
  return {
    plugins: [desktopPlugin] as any,
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      port: 3000,
    },
    build: {
      target: "esnext",
    },
    define: {
      "import.meta.env.VITE_OPENCODE_HOMEVIEW": homeViewValue,
    },
  }
})
