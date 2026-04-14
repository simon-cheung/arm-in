#!/usr/bin/env bun
import { $ } from "bun"

const desktopDir = "packages/desktop/src-tauri"
const releaseDir = `${desktopDir}/target/release`
const depsExe = `${releaseDir}/deps/opencode_desktop.exe`
const releaseExe = `${releaseDir}/OpenCode.exe`

const args = Bun.argv.slice(2)
await $`bun run --cwd packages/desktop tauri ${args}`

if (await Bun.file(depsExe).exists()) {
  await $`cp ${depsExe} ${releaseExe}`
  console.log(`Copied ${depsExe} to ${releaseExe}`)
} else {
  console.warn(`Not found: ${depsExe}`)
}
