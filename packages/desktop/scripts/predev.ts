import { $ } from "bun"

import { copyBinaryToSidecarFolder, getCurrentSidecar, getRustTarget, windowsify } from "./utils"

const RUST_TARGET = getRustTarget()

const sidecarConfig = getCurrentSidecar(RUST_TARGET)

const binaryPath = windowsify(`../opencode/dist/${sidecarConfig.ocBinary}/bin/opencode`)

await (sidecarConfig.ocBinary.includes("-baseline")
  ? $`cd ../opencode && bun run build --single --baseline`
  : $`cd ../opencode && bun run build --single`)

await copyBinaryToSidecarFolder(binaryPath, RUST_TARGET)
