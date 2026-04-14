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

const localBinary = path.join(opencodeDir, "dist/opencode-windows-x64/bin/opencode.exe")
await copyBinaryToSidecarFolder(windowsify(localBinary), sidecarConfig.rustTarget, desktopDir)
