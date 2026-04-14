#!/usr/bin/env bun
import { $ } from "bun"

const args = Bun.argv.slice(2)
await $`tauri ${args}`

const desktopDir = "src-tauri"
const releaseDir = `${desktopDir}/target/release`
const depsExe = `${releaseDir}/deps/opencode_desktop.exe`
const releaseExe = `${releaseDir}/OpenCode.exe`

if (args[0] === "build" && await Bun.file(depsExe).exists()) {
  await $`cp ${depsExe} ${releaseExe}`
  console.log(`Copied ${depsExe} to ${releaseExe}`)
}
