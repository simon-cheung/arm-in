#!/usr/bin/env bun
import path from "path"
import { $ } from "bun"

import { Script } from "@opencode-ai/script"
import { copyBinaryToSidecarFolder, getCurrentSidecar, windowsify } from "./utils"

const desktopDir = path.resolve(__dirname, "..")

const sidecarConfig = getCurrentSidecar()

const pkg = await Bun.file(`${desktopDir}/package.json`).json()
pkg.version = Script.version
await Bun.write(`${desktopDir}/package.json`, JSON.stringify(pkg, null, 2) + "\n")
console.log(`Updated package.json version to ${Script.version}`)

console.log(`Building opencode-cli locally for ${sidecarConfig.rustTarget}`)
const opencodeDir = path.resolve(desktopDir, "../opencode")
const buildScript = path.join(opencodeDir, "script/build.ts")
await $`bun ${buildScript} --single`.cwd(opencodeDir)

const cliName = process.env.OPENCODE_CLI_NAME ?? "opencode-cli"
const target = sidecarConfig.rustTarget
const sidecarBinary = windowsify(`${desktopDir}/src-tauri/sidecars/${cliName}-${target}`)

const localBinary = path.join(opencodeDir, "dist/opencode-windows-x64/bin/opencode.exe")
await copyBinaryToSidecarFolder(windowsify(localBinary), target, desktopDir)

// Smoke test the actual binary that desktop will use
console.log(`\nRunning smoke test: ${cliName}-${target} --version`)
const versionOutput = await $`${sidecarBinary} --version`.text()
console.log(`Smoke test passed: ${versionOutput.trim()}`)
