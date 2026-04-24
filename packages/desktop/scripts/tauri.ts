#!/usr/bin/env bun
import path from "path"
import { $ } from "bun"

import { getRustTarget } from "./utils"

const desktopDir = path.resolve(__dirname, "..")
const args = Bun.argv.slice(2)


// Pass env vars to tauri build (needed for Rust compile-time constants via build.rs)
const cliName = process.env.OPENCODE_CLI_NAME
console.log(`Passing OPENCODE_CLI_NAME=${cliName} to tauri build`)

if (args[0] === "build"){
  console.log(`tauri ${args} --config ${desktopDir}/src-tauri/tauri.prod.conf.json`)
  await $`tauri ${args} --config ${desktopDir}/src-tauri/tauri.prod.conf.json`.env(process.env)
}
else{
  await $`tauri ${args}`.env(process.env)
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
