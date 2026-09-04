import { execFile } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import type { Configuration } from "electron-builder"

const execFileAsync = promisify(execFile)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const signScript = path.join(rootDir, "script", "sign-windows.ps1")

async function signWindows(configuration: { path: string }) {
  if (process.platform !== "win32") return
  if (process.env.GITHUB_ACTIONS !== "true") return

  await execFileAsync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", signScript, configuration.path],
    { cwd: rootDir },
  )
}

const channel = (() => {
  const raw = process.env.OPENCODE_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "dev"
})()

const getBase = (): Configuration => ({
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  files: ["out/**/*", "resources/**/*"],
  extraResources: [
    {
      from: "native/",
      to: "native/",
      filter: ["index.js", "index.d.ts", "build/Release/mac_window.node", "swift-build/**"],
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    icon: `resources/icons/icon.icns`,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    notarize: true,
    target: ["dmg", "zip"],
    artifactName: "armin-installer-${version}-${arch}.${ext}",
  },
  dmg: {
    sign: true,
  },
  protocols: {
    name: "ArmIn",
    schemes: ["opencode"],
  },
  win: {
    icon: `resources/icons/icon.ico`,
    signtoolOptions: {
      sign: signWindows,
    },
    target: ["nsis"],
    artifactName: "armin-installer-${version}.${ext}",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: `resources/icons/icon.ico`,
    installerHeaderIcon: `resources/icons/icon.ico`,
  },
  linux: {
    icon: `resources/icons`,
    category: "Development",
    target: ["AppImage", "deb", "rpm"],
    artifactName: "armin-installer-${version}-${arch}.${ext}",
  },
})

function getConfig() {
  const base = getBase()

  switch (channel) {
    case "dev": {
      return {
        ...base,
        appId: "com.ggvale.armin.desktop.dev",
        productName: "ArmIn Dev",
        linux: { ...base.linux, executableName: "armin-dev" },
        rpm: { packageName: "armin-dev" },
      }
    }
    case "beta": {
      return {
        ...base,
        appId: "com.ggvale.armin.desktop.beta",
        productName: "ArmIn Beta",
        protocols: { name: "ArmIn Beta", schemes: ["opencode"] },
        // beta 渠道不自更新：构建时不写入 app-update.yml，避免自动拉取 latest
        // 运行时由 setupAutoUpdater 跳过 setFeedURL
        linux: { ...base.linux, executableName: "armin-beta" },
        rpm: { packageName: "armin-beta" },
      }
    }
    case "prod": {
      return {
        ...base,
        appId: "com.ggvale.armin.desktop",
        productName: "ArmIn Desktop",
        protocols: { name: "ArmIn Desktop", schemes: ["opencode"] },
        publish: {
          provider: "generic",
          url: process.env.OPENCODE_UPDATE_URL ?? "https://armin.com.cn/api/armin/updates",
          channel: "latest",
        },
        linux: { ...base.linux, executableName: "armin-desktop" },
        rpm: { packageName: "armin" },
      }
    }
  }
}

export default getConfig()
