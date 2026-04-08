#!/usr/bin/env bun

import { $ } from "bun"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const root = path.resolve(__dirname, "..")

const targets = ["opencode", "sdk", "desktop"] as const
type Target = (typeof targets)[number]

const args = Bun.argv.slice(2)
const selected = new Set<Target>(targets)

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "--help" || arg === "-h") {
    console.log(`
Usage: bun script/build.ts [options]

Build opencode, sdk, and desktop (tauri) packages.

Options:
  -t, --target <name>   Build specific target: ${targets.join(" | ")}
  -s, --skip <name>     Skip specific target: ${targets.join(" | ")}
  -h, --help            Show this help message

Examples:
  bun script/build.ts                    # Build all
  bun script/build.ts -t opencode         # Build only opencode
  bun script/build.ts -s desktop          # Build all except desktop
`)
    process.exit(0)
  }
  if (arg === "--target" || arg === "-t") {
    const val = args[++i]
    if (!val || !targets.includes(val as Target)) {
      console.error(`Unknown target: ${val}`)
      console.error(`Valid targets: ${targets.join(", ")}`)
      process.exit(1)
    }
    selected.clear()
    selected.add(val as Target)
  }
  if (arg === "--skip" || arg === "-s") {
    const val = args[++i]
    if (!val) {
      console.error("--skip requires a value")
      process.exit(1)
    }
    for (const s of val.split(",").filter(Boolean)) {
      if (!targets.includes(s as Target)) {
        console.error(`Unknown skip target: ${s}`)
        console.error(`Valid targets: ${targets.join(", ")}`)
        process.exit(1)
      }
      selected.delete(s as Target)
    }
  }
}

if (selected.size === 0) {
  console.error("No targets selected")
  process.exit(1)
}

console.log(`Building: ${[...selected].join(", ")}`)

if (selected.has("opencode")) {
  console.log("\n=== Building opencode ===")
  await $`bun run --cwd packages/opencode build`
}

if (selected.has("sdk")) {
  console.log("\n=== Building SDK ===")
  await $`bun run --cwd packages/sdk build`
}

if (selected.has("desktop")) {
  console.log("\n=== Building desk$top (Tauri) ===")
  // await $`bun run build`.cwd(`${root}/packages/desktop`)
  // await $`bun run tauri build`.cwd(`${root}/packages/desktop`)
  await $`bun run --cwd packages/desktop tauri build`
}

console.log("\n=== Done ===")
