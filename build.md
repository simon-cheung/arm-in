# Desktop Build Guide

## Build Commands

### Local Build (with local opencode-cli)

```bash
cd packages/desktop
bun run build:local
```

This builds the frontend and compiles a local opencode-cli binary into the sidecar.

### Tauri Build

```bash
cd packages/desktop
bun run tauri build
```

### Dev Mode

```bash
cd packages/desktop
bun run tauri dev
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` in `packages/desktop/`:

```bash
cp packages/desktop/.env.example packages/desktop/.env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_APP_NAME` | `OpenCode` | Desktop app binary name (also used for post-build copy step) |
| `OPENCODE_CLI_NAME` | `opencode-cli` | CLI binary name (affects sidecar filename, externalBin, Rust compile-time constant) |
| `OPENCODE_ICON_THEME` | `dev` | Icon theme: `dev` or `beta` (located in `src-tauri/icons/`) |

### Tauri Config

- `tauri.conf.json` — base config (dev defaults)
- `tauri.prod.json` — overrides applied during `bun run tauri build`
- `tauri.dev.json` — overrides applied during `bun run tauri dev`

Config fields that can be overridden per environment:

| Field | tauri.prod.json |
|-------|----------------|
| `productName` | ✅ |
| `version` | ✅ |
| `bundle.icon` | ✅ (auto-injected from `OPENCODE_ICON_THEME`) |
| `bundle.externalBin` | ✅ (auto-injected from `OPENCODE_CLI_NAME`) |
| `bundle.windows.nsis.installerIcon` | ✅ (auto-injected from `OPENCODE_ICON_THEME`) |

### Icon Themes

Available themes under `src-tauri/icons/`:

- `dev/` — default development icons
- `beta/` — alternative icons

Set via `OPENCODE_ICON_THEME=beta` in `.env.local`.

### Custom CLI Name

Set `OPENCODE_CLI_NAME=my-cli` in `.env.local`. This affects:

1. **Sidecar folder**: `src-tauri/sidecars/my-cli-{TARGET}`
2. **externalBin path**: `sidecars/my-cli-{TARGET}`
3. **Rust binary path**: `get_sidecar_path()` uses `env!("OPENCODE_CLI_NAME")`
4. **macOS killall**: `killall my-cli` (debug builds)

## Build Output

- Windows installer: `src-tauri/target/release/bundle/nsis/*.exe`
- macOS app: `src-tauri/target/release/bundle/macos/*.app`
- Linux packages: `src-tauri/target/release/bundle/deb/*.deb`, `src-tauri/target/release/bundle/rpm/*.rpm`
