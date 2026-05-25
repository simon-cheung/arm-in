import { Flag } from "@/flag/flag"
import { Hono } from "hono"
import { proxy } from "hono/proxy"
import { getMimeType } from "hono/utils/mime"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import * as path from "node:path"
import { Filesystem } from "@/util/filesystem"
import { base64Decode } from "@opencode-ai/util/encode"

const embeddedUIPromise = Flag.OPENCODE_DISABLE_EMBEDDED_WEB_UI
  ? Promise.resolve(null)
  : // @ts-expect-error - generated file at build time
    import("opencode-web-ui.gen.ts").then((module) => module.default as Record<string, string>).catch(() => null)

const DEFAULT_CSP = "default-src * 'unsafe-inline' data:; script-src * 'unsafe-inline' 'unsafe-eval' data:;"

export const UIRoutes = (): Hono =>
  new Hono().all("/*", async (c) => {
    const urlPath = c.req.path
    console.log(`[UIRoutes] ${c.req.method} ${c.req.path}`)
    if (urlPath.startsWith("/__workdir__/")) {
      const remaining = urlPath.slice("/__workdir__/".length)
      const firstSlash = remaining.indexOf("/")

      if (firstSlash > 0) {
        const encodedDir = remaining.slice(0, firstSlash)
        const filePath = remaining.slice(firstSlash + 1)

        try {
          const workspaceDir = base64Decode(encodedDir)
          const fullPath = path.join(workspaceDir, filePath)

          if (Filesystem.contains(workspaceDir, fullPath)) {
            await fs.access(fullPath)
            const bytes = await fs.readFile(fullPath)
            const mimeType = getMimeType(fullPath) || "application/octet-stream"
            c.header("Content-Type", mimeType)
            return c.body(new Uint8Array(bytes))
          }
        } catch {
          // Invalid base64 or file not accessible
        }
      }

      return c.json({ error: "Not Found" }, 404)
    }

    const embeddedWebUI = await embeddedUIPromise
    if (embeddedWebUI) {
      const match = embeddedWebUI[urlPath.replace(/^\//, "")] ?? embeddedWebUI["index.html"] ?? null
      if (!match) return c.json({ error: "Not Found" }, 404)

      if (await fs.exists(match)) {
        const mime = getMimeType(match) ?? "text/plain"
        c.header("Content-Type", mime)
        if (mime.startsWith("text/html")) {
          c.header("Content-Security-Policy", DEFAULT_CSP)
        }
        return c.body(new Uint8Array(await fs.readFile(match)))
      } else {
        return c.json({ error: "Not Found" }, 404)
      }
    } else {
      const response = await proxy(`https://app.opencode.ai${urlPath}`, {
        ...c.req,
        headers: {
          ...c.req.raw.headers,
          host: "app.opencode.ai",
        },
      })
      const match = response.headers.get("content-type")?.includes("text/html")
        ? (await response.clone().text()).match(
            /<script\b(?![^>]*\bsrc\s*=)[^>]*\bid=(['"])oc-theme-preload-script\1[^>]*>([\s\S]*?)<\/script>/i,
          )
        : undefined
      const hash = match ? createHash("sha256").update(match[2]).digest("base64") : ""
      response.headers.set("Content-Security-Policy", DEFAULT_CSP)
      return response
    }
  })
