import { Hono } from "hono"
import { Instance } from "@/project/instance"
import { getMimeType } from "hono/utils/mime"
import * as fs from "node:fs/promises"
import * as path from "node:path"

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

  // 只处理 /.apps/ 下的文件
  if (!urlPath.startsWith("/.apps/")) return c.json({ error: "Not found" }, 404)

  if (!urlPath.includes(".")) return c.json({ error: "Not found" }, 404)

  if (knownPrefixes.some((p) => urlPath.startsWith(p))) return c.json({ error: "Not found" }, 404)

  // urlPath 格式: /.apps/foo/bar.html -> foo/bar.html
  const relativePath = urlPath.replace(/^\/\.apps\//, "")
  const normalized = path.normalize(relativePath)

  if (normalized.includes("..")) return c.json({ error: "Not found" }, 404)

  const fullPath = path.join(Instance.directory, normalized)

  if (!Instance.containsPath(fullPath)) {
    return c.json({ error: "Access denied" }, 403)
  }

  try {
    await fs.access(fullPath)
  } catch {
    return c.json({ error: "Not found" }, 404)
  }

  const bytes = await fs.readFile(fullPath)
  const ext = path.extname(normalized).toLowerCase()
  const mimeType = mimeMap[ext] || getMimeType(normalized) || "application/octet-stream"

  c.header("Content-Type", mimeType)
  return c.body(new Uint8Array(bytes))
})
