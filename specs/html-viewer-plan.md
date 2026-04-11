# HTML 渲染功能计划

## 目标

用户点击 HTML 文件时，直接在 iframe 中渲染，同时浏览器能自动加载同目录下的 CSS、JS、图片等资源文件。

## 架构

```
用户点击 foo/bar.html
       │
       ▼
┌─────────────────────────────────────┐
│  Client                             │
│  HtmlViewer: iframe.src = "/foo/bar.html"
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Server                             │
│  FsRoutes: /*                       │
│  → 映射到 {项目目录}/foo/bar.html  │
│  → 返回 HTML + 设置正确 MIME        │
│                                     │
│  HTML 引用 ./style.css              │
│  → 浏览器请求 GET /foo/style.css    │
│  → FsRoutes 返回 CSS               │
└─────────────────────────────────────┘
```

## 工作流程

```
1. 用户点击 foo/bar.html
2. 客户端请求 /file/content?path=foo/bar.html 获取文件内容
3. HtmlViewer 设置 iframe.src = "/foo/bar.html"
4. 浏览器请求 GET /foo/bar.html
5. FsRoutes 匹配并返回 HTML
6. HTML 解析，发现 <link href="./style.css">
7. 浏览器请求 GET /foo/style.css
8. FsRoutes 返回 CSS
9. 页面渲染完成
```

## 实现步骤

### 1. 客户端 - 新增 HtmlViewer 组件

**文件**: `packages/ui/src/components/html-viewer.tsx`

```tsx
import { createEffect, onMount } from "solid-js"

export function HtmlViewer(props: { file: FileContents; path?: string }) {
  let iframeRef: HTMLIFrameElement | undefined

  const getSrc = () => {
    if (!props.path) return "about:blank"
    return `/${props.path}`
  }

  onMount(() => {
    if (iframeRef) iframeRef.src = getSrc()
  })

  createEffect(() => {
    if (iframeRef) iframeRef.src = getSrc()
  })

  return <iframe ref={iframeRef} class="w-full h-full border-0" sandbox="allow-same-origin" />
}
```

### 2. 客户端 - 修改 File 组件

**文件**: `packages/ui/src/components/file.tsx`

添加 HTML 文件检测：

```tsx
const HTML_EXTS = [".html", ".htm"]

function isHtmlFile(file: { name: string }): boolean {
  const match = file.name.match(/\.[^.]+$/)
  return match ? HTML_EXTS.includes(match[0].toLowerCase()) : false
}
```

在 `mode === "text"` 的判断中添加：

```tsx
const useHtml = isHtmlFile(props.file)
if (useHtml) {
  return <FileMedia media={props.media} fallback={() => <HtmlViewer {...props} path={props.file.path} />} />
}
```

### 3. 服务端 - 新增 FsRoutes

**文件**: `packages/opencode/src/server/routes/fs.ts`

```typescript
import { Hono } from "hono"
import { Instance } from "@/project/instance"
import { AppFileSystem } from "@/filesystem"
import { getMimeType } from "hono/utils/mime"
import path from "path"

const knownPrefixes = [
  "/file/",
  "/session",
  "/project",
  "/permission",
  "/question",
  "/provider",
  "/pty",
  "/config",
  "/mcp",
  "/tui",
  "/event",
  "/command",
  "/agent",
  "/skill",
  "/lsp",
  "/formatter",
  "/vcs",
  "/instance",
  "/path",
]

const mimeMap: Record<string, string> = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
}

export const FsRoutes = new Hono().get("/*", async (c) => {
  const urlPath = c.req.path

  // 不是文件路径（不含 .），让其他路由处理
  if (!urlPath.includes(".")) return c.json({ error: "Not found" }, 404)

  // 跳过已知 API 前缀
  if (knownPrefixes.some((p) => urlPath.startsWith(p))) return c.json({ error: "Not found" }, 404)

  const relativePath = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath
  const normalized = path.normalize(relativePath)

  // 防止路径穿越
  if (normalized.includes("..")) return c.json({ error: "Not found" }, 404)

  const fullPath = path.join(Instance.directory, normalized)

  if (!Instance.containsPath(fullPath)) {
    return c.json({ error: "Access denied" }, 403)
  }

  const fs = yield * AppFileSystem.Service
  const exists = yield * fs.existsSafe(fullPath)
  if (!exists) return c.json({ error: "Not found" }, 404)

  const bytes = yield * fs.readFile(fullPath)
  const ext = path.extname(normalized).toLowerCase()
  const mimeType = mimeMap[ext] || getMimeType(normalized) || "application/octet-stream"

  c.header("Content-Type", mimeType)
  return c.body(bytes)
})
```

### 4. 服务端 - 注册路由

**文件**: `packages/opencode/src/server/instance.ts`

```typescript
import { FsRoutes } from "./routes/fs"

export const InstanceRoutes = (upgrade: UpgradeWebSocket, app: Hono = new Hono()) =>
  app
    .onError(errorHandler(log))
    .route("/*", FsRoutes) // 在 /* catch-all 之前，处理文件请求
    .route("/project", ProjectRoutes())
    .route("/pty", PtyRoutes(upgrade))
    .route("/config", ConfigRoutes())
    .route("/experimental", ExperimentalRoutes())
    .route("/session", SessionRoutes())
    .route("/permission", PermissionRoutes())
    .route("/question", QuestionRoutes())
    .route("/provider", ProviderRoutes())
    .route("/", FileRoutes())
    .route("/", EventRoutes())
    .route("/mcp", McpRoutes())
    .route("/tui", TuiRoutes())
    // ...
    .all("/*", async (c) => {
      /* 嵌入式 Web UI / 代理逻辑 */
    })
```

## 安全考虑

1. **路径验证**: `Instance.containsPath()` 确保路径不能穿越到项目目录外
2. **路径穿越防护**: 检测 `..` 模式
3. **API 前缀保护**: 跳过已知 API 路径，避免与 REST API 冲突
4. **iframe sandbox**: `sandbox="allow-same-origin"` 限制脚本执行权限

## 测试场景

1. 点击 `index.html` → 正常渲染
2. HTML 引用 `./style.css` → CSS 正常加载
3. HTML 引用 `../assets/logo.png` → 图片正常加载
4. HTML 引用 `/etc/passwd` → 返回 403/404
5. 访问 `/file/content` → 正常返回 API 响应（不走 FsRoutes）
