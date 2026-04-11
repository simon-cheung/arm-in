# Features from opencode

## HTML Preview

### 功能概述

支持在 OpenCode 中预览 HTML 文件。当用户点击 `.apps` 目录下的 HTML 文件时，会在 iframe 中渲染该文件，同时加载同目录下的 CSS、JS、图片等资源。

### 工作原理

1. **客户端**：点击 HTML 文件时，使用 `HtmlViewer` 组件在 iframe 中渲染
2. **服务端**：静态文件服务处理 `/.apps/{base64EncodedDir}/{relativePath}` 格式的请求

### URL 格式

```
http://localhost:4096/.apps/{base64EncodedWorkspaceDir}/{relativePath}
```

例如：

- Workspace: `/Users/simon/gprj/JJBoom-show`
- HTML 文件: `.apps/foo/bar.html`
- 完整 URL: `http://localhost:4096/.apps/L01Vc2Vycy9zL2dwcmovSkpCb29tLXNob3c=/.apps/foo/bar.html`

### 关键文件

| 文件                                         | 作用                            |
| -------------------------------------------- | ------------------------------- |
| `packages/ui/src/components/html-viewer.tsx` | HtmlViewer 组件                 |
| `packages/ui/src/components/html-viewer.css` | 样式                            |
| `packages/ui/src/components/file.tsx`        | 文件类型检测（isHtmlFile）      |
| `packages/ui/src/components/file-media.tsx`  | 媒体文件处理                    |
| `packages/opencode/src/server/instance.ts`   | 静态文件服务（`/.apps/*` 路由） |

### 调试

#### API 服务器（端口 4096）

```bash
cd packages/opencode
bun run --inspect-wait ./src/index.ts serve --port 4096
```

在 VSCode 中打开 `packages/opencode/.vscode/launch.json`，选择 "Debug API Server (4096)" 开始调试。

#### 检查请求

```bash
curl -v http://localhost:4096/.apps/{base64EncodedDir}/.apps/foo/bar.html
```

### 相关配置

#### Vite 代理（开发环境）

`packages/app/vite.config.ts` 中配置了代理：

```ts
server: {
  proxy: {
    "/.apps": {
      target: "http://localhost:4096",
      changeOrigin: true,
    },
  },
}
```

#### HtmlViewer Props

```tsx
interface HtmlViewerProps {
  file: FileContents // 文件内容
  path?: string // 文件路径（如 `.apps/foo/bar.html`）
  directory?: string // Workspace 目录（如 `/Users/simon/gprj/JJBoom-show`）
  serverUrl?: string // API 服务器地址（如 `http://localhost:4096`）
}
```

### 安全考虑

- 仅支持 `.apps` 目录下的 HTML 文件
- Workspace 目录通过 base64 编码传输
- iframe 使用 `sandbox="allow-same-origin allow-scripts"`

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

