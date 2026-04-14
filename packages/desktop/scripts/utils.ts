import { $ } from "bun"

export const SIDECAR_BINARIES: Array<{ rustTarget: string; ocBinary: string; assetExt: string }> = [
  {
    rustTarget: "aarch64-apple-darwin",
    ocBinary: "opencode-darwin-arm64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-apple-darwin",
    ocBinary: "opencode-darwin-x64-baseline",
    assetExt: "zip",
  },
  {
    rustTarget: "aarch64-pc-windows-msvc",
    ocBinary: "opencode-windows-arm64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-pc-windows-msvc",
    ocBinary: "opencode-windows-x64-baseline",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-unknown-linux-gnu",
    ocBinary: "opencode-linux-x64-baseline",
    assetExt: "tar.gz",
  },
  {
    rustTarget: "aarch64-unknown-linux-gnu",
    ocBinary: "opencode-linux-arm64",
    assetExt: "tar.gz",
  },
]

const platformMap: Record<string, Record<string, string>> = {
  win32: { x64: "x86_64-pc-windows-msvc", arm64: "aarch64-pc-windows-msvc" },
  darwin: { x64: "x86_64-apple-darwin", arm64: "aarch64-apple-darwin" },
  linux: { x64: "x86_64-unknown-linux-gnu", arm64: "aarch64-unknown-linux-gnu" },
}

export function getRustTarget(): string {
  // Tauri sets this when running build/dev
  if (Bun.env.TAURI_ENV_TARGET_TRIPLE) return Bun.env.TAURI_ENV_TARGET_TRIPLE
  // Explicit override
  if (Bun.env.RUST_TARGET) return Bun.env.RUST_TARGET
  // Auto-detect from platform
  const platform = process.platform
  const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch
  const detected = platformMap[platform]?.[arch]
  if (!detected) throw new Error(`Cannot detect RUST_TARGET for ${platform}/${arch}`)
  return detected
}

export const RUST_TARGET = getRustTarget()

export function getCurrentSidecar(target = RUST_TARGET) {
  const binaryConfig = SIDECAR_BINARIES.find((b) => b.rustTarget === target)
  if (!binaryConfig) throw new Error(`Sidecar configuration not available for Rust target '${target}'`)

  return binaryConfig
}

export async function copyBinaryToSidecarFolder(source: string, target = RUST_TARGET, baseDir = "") {
  const sidecarsDir = baseDir ? `${baseDir}/src-tauri/sidecars` : "src-tauri/sidecars"
  await $`mkdir -p ${sidecarsDir}`
  const dest = windowsify(`${sidecarsDir}/opencode-cli-${target}`)
  await $`cp ${source} ${dest}`
  if (process.platform === "win32" && process.env.GITHUB_ACTIONS === "true") {
    await $`pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File ../../script/sign-windows.ps1 ${dest}`
  }

  console.log(`Copied ${source} to ${dest}`)
}

export function windowsify(path: string) {
  if (path.endsWith(".exe")) return path
  return `${path}${process.platform === "win32" ? ".exe" : ""}`
}
