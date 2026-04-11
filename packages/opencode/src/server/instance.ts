import { describeRoute, resolver, validator } from "hono-openapi"
import { Hono } from "hono"
import { proxy } from "hono/proxy"
import type { UpgradeWebSocket } from "hono/ws"
import z from "zod"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { Log } from "../util/log"
import { Format } from "../format"
import { TuiRoutes } from "./routes/tui"
import { Instance } from "../project/instance"
import { Vcs } from "../project/vcs"
import { Agent } from "../agent/agent"
import { Skill } from "../skill"
import { Global } from "../global"
import { LSP } from "../lsp"
import { Command } from "../command"
import { Flag } from "../flag/flag"
import { QuestionRoutes } from "./routes/question"
import { PermissionRoutes } from "./routes/permission"
import { Snapshot } from "@/snapshot"
import { ProjectRoutes } from "./routes/project"
import { SessionRoutes } from "./routes/session"
import { PtyRoutes } from "./routes/pty"
import { McpRoutes } from "./routes/mcp"
import { FileRoutes } from "./routes/file"
import { ConfigRoutes } from "./routes/config"
import { ExperimentalRoutes } from "./routes/experimental"
import { ProviderRoutes } from "./routes/provider"
import { EventRoutes } from "./routes/event"
import { errorHandler } from "./middleware"
import { getMimeType } from "hono/utils/mime"

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

const log = Log.create({ service: "server" })

const embeddedUIPromise = Flag.OPENCODE_DISABLE_EMBEDDED_WEB_UI
  ? Promise.resolve(null)
  : // @ts-expect-error - generated file at build time
    import("opencode-web-ui.gen.ts").then((module) => module.default as Record<string, string>).catch(() => null)

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' data:"

const csp = (hash = "") =>
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'${hash ? ` 'sha256-${hash}'` : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' data:`

export const InstanceRoutes = (upgrade: UpgradeWebSocket, app: Hono = new Hono()) =>
  app
    .onError(errorHandler(log))
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
    .post(
      "/instance/dispose",
      describeRoute({
        summary: "Dispose instance",
        description: "Clean up and dispose the current OpenCode instance, releasing all resources.",
        operationId: "instance.dispose",
        responses: {
          200: {
            description: "Instance disposed",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
        },
      }),
      async (c) => {
        await Instance.dispose()
        return c.json(true)
      },
    )
    .get(
      "/path",
      describeRoute({
        summary: "Get paths",
        description: "Retrieve the current working directory and related path information for the OpenCode instance.",
        operationId: "path.get",
        responses: {
          200: {
            description: "Path",
            content: {
              "application/json": {
                schema: resolver(
                  z
                    .object({
                      home: z.string(),
                      state: z.string(),
                      config: z.string(),
                      worktree: z.string(),
                      directory: z.string(),
                    })
                    .meta({
                      ref: "Path",
                    }),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json({
          home: Global.Path.home,
          state: Global.Path.state,
          config: Global.Path.config,
          worktree: Instance.worktree,
          directory: Instance.directory,
        })
      },
    )
    .get(
      "/vcs",
      describeRoute({
        summary: "Get VCS info",
        description: "Retrieve version control system (VCS) information for the current project, such as git branch.",
        operationId: "vcs.get",
        responses: {
          200: {
            description: "VCS info",
            content: {
              "application/json": {
                schema: resolver(Vcs.Info),
              },
            },
          },
        },
      }),
      async (c) => {
        const [branch, default_branch] = await Promise.all([Vcs.branch(), Vcs.defaultBranch()])
        return c.json({
          branch,
          default_branch,
        })
      },
    )
    .get(
      "/vcs/diff",
      describeRoute({
        summary: "Get VCS diff",
        description: "Retrieve the current git diff for the working tree or against the default branch.",
        operationId: "vcs.diff",
        responses: {
          200: {
            description: "VCS diff",
            content: {
              "application/json": {
                schema: resolver(Vcs.FileDiff.array()),
              },
            },
          },
        },
      }),
      validator(
        "query",
        z.object({
          mode: Vcs.Mode,
        }),
      ),
      async (c) => {
        return c.json(await Vcs.diff(c.req.valid("query").mode))
      },
    )
    .get(
      "/command",
      describeRoute({
        summary: "List commands",
        description: "Get a list of all available commands in the OpenCode system.",
        operationId: "command.list",
        responses: {
          200: {
            description: "List of commands",
            content: {
              "application/json": {
                schema: resolver(Command.Info.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        const commands = await Command.list()
        return c.json(commands)
      },
    )
    .get(
      "/agent",
      describeRoute({
        summary: "List agents",
        description: "Get a list of all available AI agents in the OpenCode system.",
        operationId: "app.agents",
        responses: {
          200: {
            description: "List of agents",
            content: {
              "application/json": {
                schema: resolver(Agent.Info.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        const modes = await Agent.list()
        return c.json(modes)
      },
    )
    .get(
      "/skill",
      describeRoute({
        summary: "List skills",
        description: "Get a list of all available skills in the OpenCode system.",
        operationId: "app.skills",
        responses: {
          200: {
            description: "List of skills",
            content: {
              "application/json": {
                schema: resolver(Skill.Info.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        const skills = await Skill.all()
        return c.json(skills)
      },
    )
    .get(
      "/lsp",
      describeRoute({
        summary: "Get LSP status",
        description: "Get LSP server status",
        operationId: "lsp.status",
        responses: {
          200: {
            description: "LSP server status",
            content: {
              "application/json": {
                schema: resolver(LSP.Status.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(await LSP.status())
      },
    )
    .get(
      "/formatter",
      describeRoute({
        summary: "Get formatter status",
        description: "Get formatter status",
        operationId: "formatter.status",
        responses: {
          200: {
            description: "Formatter status",
            content: {
              "application/json": {
                schema: resolver(Format.Status.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(await Format.status())
      },
    )
    .all("/*", async (c) => {
      const urlPath = c.req.path
      console.log(`[InstanceRoutes] ${c.req.method} ${urlPath}`)

      // Check if this looks like a static file request (has a file extension)
      // and is not an API path - serve from local filesystem
      if (
        urlPath.includes(".") &&
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
        let workspaceDir = Instance.directory
        let filePath = remaining

        if (firstSlash > 0) {
          const encodedDir = remaining.substring(0, firstSlash)
          try {
            // Decode base64 to get workspace directory
            workspaceDir = Buffer.from(encodedDir, "base64").toString("utf8")
            // filePath is the rest after the encoded dir
            filePath = remaining.substring(firstSlash + 1)
            // Prepend .apps/ to get the full relative path from workspace root
            filePath = `.apps/${filePath}`
          } catch {
            // Invalid base64, use default workspace
          }
        }

        if (!filePath.includes("..")) {
          const fullPath = path.join(workspaceDir, filePath)
          try {
            await fs.access(fullPath)
            const bytes = await fs.readFile(fullPath)
            const ext = path.extname(filePath).toLowerCase()
            const mimeType = mimeMap[ext] || getMimeType(filePath) || "application/octet-stream"
            c.header("Content-Type", mimeType)
            return c.body(new Uint8Array(bytes))
          } catch {
            // File doesn't exist, continue to normal handling
          }
        }
      }

      const embeddedWebUI = await embeddedUIPromise
      const reqPath = urlPath

      if (embeddedWebUI) {
        const match = embeddedWebUI[reqPath.replace(/^\//, "")] ?? embeddedWebUI["index.html"] ?? null
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
        const response = await proxy(`https://app.opencode.ai${reqPath}`, {
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
        response.headers.set("Content-Security-Policy", csp(hash))
        return response
      }
    })
