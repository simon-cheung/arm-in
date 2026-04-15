import { Flag } from "@/flag/flag"
import { Hono } from "hono"
import { proxy } from "hono/proxy"
import { getMimeType } from "hono/utils/mime"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import * as path from "node:path"

const embeddedUIPromise = Flag.OPENCODE_DISABLE_EMBEDDED_WEB_UI
  ? Promise.resolve(null)
  : // @ts-expect-error - generated file at build time
    import("opencode-web-ui.gen.ts").then((module) => module.default as Record<string, string>).catch(() => null)

    // "csp": "default-src *; frame-src *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *; img-src * data:; style-src * 'unsafe-inline';"
const DEFAULT_CSP =
  "default-src * 'unsafe-inline' data:; script-src * 'unsafe-inline' 'unsafe-eval' data:;"

const csp = (hash = "") =>
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'${hash ? ` 'sha256-${hash}'` : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' data:`

export const UIRoutes = (): Hono =>
  new Hono().all("/*", async (c) => {
    console.log(`[InstanceRoutes] ${c.req.method} ${c.req.path}`)

    let [ok, resp ] = await CheckHtmlPreview(c);
    if(ok)
      return resp
    const embeddedWebUI = await embeddedUIPromise
    const path = c.req.path

    if (embeddedWebUI) {
      const match = embeddedWebUI[path.replace(/^\//, "")] ?? embeddedWebUI["index.html"] ?? null
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
      const response = await proxy(`https://app.opencode.ai${path}`, {
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
      response.headers.set("Content-Security-Policy", DEFAULT_CSP /*csp(hash)*/)
      return response
    }
  })

const CheckHtmlPreview = async (c: any)=>{
  
  const urlPath = c.req.path

  // Check if this looks like a static file request (has a file extension)
  // and is not an API path - serve from local filesystem
  if (
    urlPath.includes(".apps") &&
    !urlPath.startsWith("/session") &&
    !urlPath.startsWith("/project") &&
    !urlPath.startsWith("/file") &&
    !urlPath.startsWith("/provider")
  ) {
    // URL format: /.apps/{base64EncodedWorkspaceDir}/{relativePath}
    // relativePath is like mars_hmap/index.html (the part after .apps/)
    let remaining = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath
    remaining = remaining.replace(/^\.apps\//, "")

    // Extract workspace directory (base64 encoded) and file path
    const firstSlash = remaining.indexOf("/")
    let workspaceDir = ""
    let filePath = remaining
    let encodedDir = ""

    if (firstSlash > 0) {
      encodedDir = remaining.substring(0, firstSlash)
      try {
        // Decode URL-safe base64 to get workspace directory
        // Client uses base64Encode which replaces + with -, / with _, and removes padding
        const standardBase64 = encodedDir.replace(/-/g, "+").replace(/_/g, "/")
        const paddedBase64 = standardBase64 + "==".slice(0, (4 - standardBase64.length % 4) % 4)
        workspaceDir = Buffer.from(paddedBase64, "base64").toString("utf8")
        // filePath is the rest after the encoded dir
        filePath = remaining.substring(firstSlash + 1)
        // Prepend .apps/ to get the full relative path from workspace root
        filePath = `.apps/${filePath}`
      } catch {
        // Invalid base64, use default workspace
      }
    }

    const fullPath = path.join(workspaceDir, filePath)
    try {
      await fs.access(fullPath)
      let bytes = await fs.readFile(fullPath)
      const mimeType = getMimeType(filePath) || "application/octet-stream"
      c.header("Content-Type", mimeType)

      // For HTML files, inject a <base> tag to fix relative resource paths
      // HTML files may reference resources from root like /js/three.module.js
      // Base should point to the first /.apps/{encodedDir}/ so root-relative paths work
      if (mimeType.startsWith("text/html") && encodedDir) {
        const htmlRoot = path.relative(fullPath,  workspaceDir);
        const htmlContent = bytes.toString("utf8")
        const baseTag = `<base href="/.apps/${encodedDir}/">`
        // Inject base tag right after <head> tag
        const modifiedHtml = htmlContent.replace(/<head([^>]*)>/i, `<head$1>\n  ${baseTag}`)
        bytes = Buffer.from(htmlContent, "utf8")
      }

      return [true, c.body(new Uint8Array(bytes))]
    } catch {
      // File doesn't exist, continue to normal handling
    }
  }
  return [false, null]
}