# Development & Build Guide

## Quick Start

```bash
# Install dependencies
bun install

# Typecheck all packages
bun typecheck
```

## Development Servers

### TUI (Terminal UI)

```bash
bun dev
# or from packages/opencode
cd packages/opencode && bun run dev
```

### Web App (Frontend)

```bash
bun dev:web
# Runs on http://localhost:4444 (proxies to backend at localhost:4096)
```

### Backend Only (for web development)

```bash
# Terminal 1: Backend
bun run --cwd packages/opencode --conditions=browser ./src/index.ts serve --port 4096

# Terminal 2: Frontend
bun dev:web -- --port 4444
```

### Desktop App

```bash
bun dev:desktop
```

### Console App

```bash
bun dev:console
```

### Storybook

```bash
bun dev:storybook
# Runs on http://localhost:6006
```

## Building

### Web App

```bash
cd packages/app && bun run build
```

### Desktop App

```bash
cd packages/desktop-electron
bun run build
bun run package          # All platforms
bun run package:mac     # macOS only
bun run package:win      # Windows only
bun run package:linux    # Linux only
```

### Opencode Backend

```bash
cd packages/opencode && bun run build
```

### UI Package

```bash
cd packages/ui && bun run generate:tailwind
```

### SDK

```bash
./packages/sdk/js/script/build.ts
```

## Testing

```bash
# Run tests from package directories (NOT from root)
cd packages/opencode && bun test
cd packages/app && bun test

# App e2e tests
cd packages/app
bun run test:e2e         # Run against CI
bun run test:e2e:local    # Run locally
bun run test:e2e:ui       # Interactive UI mode

# Unit tests
cd packages/opencode && bun test --timeout 30000
```

## Type Checking

```bash
# All packages
bun typecheck

# Individual package
cd packages/<pkg> && bun typecheck
# or
cd packages/<pkg> && bun run typecheck
```

## Database (Opencode)

```bash
cd packages/opencode

# Generate migration
bun run db generate --name <migration_name>

# Apply migrations
bun drizzle-kit migrate

# Studio (GUI)
bun drizzle-kit studio
```

## Package Structure

| Package          | Path                      | Description           |
| ---------------- | ------------------------- | --------------------- |
| opencode         | packages/opencode         | Core CLI & TUI        |
| app              | packages/app              | Web frontend          |
| ui               | packages/ui               | Shared UI components  |
| desktop          | packages/desktop          | Tauri desktop wrapper |
| desktop-electron | packages/desktop-electron | Electron main process |
| sdk              | packages/sdk              | API client SDK        |
| plugin           | packages/plugin           | Plugin system         |
| web              | packages/web              | Marketing website     |
| enterprise       | packages/enterprise       | Enterprise features   |
| storybook        | packages/storybook        | Component stories     |
| console          | packages/console          | Admin console         |

## Common Tasks

### Regenerate JavaScript SDK

```bash
./packages/sdk/js/script/build.ts
```

### Update Dependencies

```bash
bun update
```

### Clean Build Artifacts

```bash
rm -rf packages/*/dist packages/*/.turbo
```

### Run Prettier

```bash
bun prettier --write "packages/**/*.ts"
```

## Notes

- Tests **cannot** be run from repo root (guard prevents it)
- Default branch is `dev`, not `main`
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs
