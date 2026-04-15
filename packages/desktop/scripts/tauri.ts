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

// Pass env vars to tauri build (needed for Rust compile-time constants via build.rs)
const cliName = process.env.OPENCODE_CLI_NAME
const tauriEnv = cliName ? { OPENCODE_CLI_NAME: cliName } : {}
if (args[0] === "build"){
  console.log(`./node_modules/.bin/tauri ${args} --config ${desktopDir}/src-tauri/tauri.prod.conf.json`)
  await $`./node_modules/.bin/tauri ${args} --config ${desktopDir}/src-tauri/tauri.prod.conf.json`.env(tauriEnv)
}
else{
  await $`./node_modules/.bin/tauri ${args}`.env(tauriEnv)
}

// Copy deps artifact to expected binary name
const mainBinName = process.env.OPENCODE_APP_NAME?.replace(/\s+/g, "") ?? "OpenCode"
const releaseDir = `${desktopDir}/src-tauri/target/release`
const depsExe = `${releaseDir}/deps/opencode_desktop.exe`
const releaseExe = `${releaseDir}/${mainBinName}.exe`

if (args[0] === "build" && await Bun.file(depsExe).exists()) {
  await $`cp ${depsExe} ${releaseExe}`
  console.log(`Copied ${depsExe} to ${releaseExe}`)
}
