#!/usr/bin/env bun
import path from "path"
import { $ } from "bun"

import { getRustTarget } from "./utils"

const desktopDir = path.resolve(__dirname, "..")
const args = Bun.argv.slice(2)

// Load .env.local for icon theme injection
const envPath = path.join(desktopDir, ".env.local")
if (await Bun.file(envPath).exists()) {
  const envFile = await Bun.file(envPath).text()
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

// Inject icon theme and CLI name into tauri.prod.json on build
if (args[0] === "build") {
  const tauriProdPath = path.join(desktopDir, "src-tauri", "tauri.prod.json")
  let tauriProdText = await Bun.file(tauriProdPath).text()
  const tauriProd = JSON.parse(tauriProdText)

  // Resolve ${TARGET} in externalBin with actual Rust target
  const target = getRustTarget()
  tauriProd.bundle.externalBin = (tauriProd.bundle.externalBin || []).map((p: string) =>
    p.replace(/\${TARGET}/g, target),
  )

  const iconTheme = process.env.OPENCODE_ICON_THEME
  if (iconTheme) {
    const iconDir = `icons/${iconTheme}`
    tauriProd.bundle.icon = [
      `${iconDir}/32x32.png`,
      `${iconDir}/128x128.png`,
      `${iconDir}/128x128@2x.png`,
      `${iconDir}/icon.icns`,
      `${iconDir}/icon.ico`,
    ]
    if (tauriProd.bundle.windows?.nsis) {
      tauriProd.bundle.windows.nsis.installerIcon = `${iconDir}/icon.ico`
    }
    console.log(`Icon theme set to: ${iconTheme}`)
  }

  const cliName = process.env.OPENCODE_CLI_NAME
  if (cliName) {
    tauriProd.bundle.externalBin = [`sidecars/${cliName}-${target}`]
    console.log(`CLI name set to: ${cliName} (target: ${target})`)
  }

  await Bun.write(tauriProdPath, JSON.stringify(tauriProd, null, 2) + "\n")
}

// Pass env vars to tauri build (needed for Rust compile-time constants via build.rs)
const cliName = process.env.OPENCODE_CLI_NAME
const tauriEnv = cliName ? { OPENCODE_CLI_NAME: cliName } : {}
await $`tauri ${args}`.env(tauriEnv)

// Copy deps artifact to expected binary name
const mainBinName = process.env.OPENCODE_APP_NAME?.replace(/\s+/g, "") ?? "OpenCode"
const releaseDir = `${desktopDir}/src-tauri/target/release`
const depsExe = `${releaseDir}/deps/opencode_desktop.exe`
const releaseExe = `${releaseDir}/${mainBinName}.exe`

if (args[0] === "build" && await Bun.file(depsExe).exists()) {
  await $`cp ${depsExe} ${releaseExe}`
  console.log(`Copied ${depsExe} to ${releaseExe}`)
}
