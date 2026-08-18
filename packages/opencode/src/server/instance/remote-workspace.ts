import { Hono } from "hono"
import { describeRoute, validator } from "hono-openapi"
import { resolver } from "hono-openapi"
import path from "node:path"
import fs from "node:fs/promises"
import z from "zod"
import { errors } from "../error"
import { lazy } from "../../util/lazy"
import { downloadToBuffer, extractZipBuffer } from "../../util/download"
import { Filesystem } from "../../util/filesystem"

const DownloadBody = z.object({
  files: z
    .array(
      z.object({
        fileName: z.string(),
        url: z.string().url(),
      }),
    )
    .min(1),
  targetDir: z.string(),
})

export const RemoteWorkspaceRoutes = lazy(() =>
  new Hono().post(
    "/download",
    describeRoute({
      summary: "Download files (and optionally extract zips) into a target directory",
      description:
        "Each file's `content` is a URL. The server downloads and writes it. ".repeat(0) +
        "Files ending with `.zip` are extracted into targetDir (the first zip in the list clears targetDir first); " +
        "all other files are written to targetDir/<fileName> as binary.",
      operationId: "experimental.remoteWorkspace.download",
      responses: {
        200: {
          description: "All files processed successfully",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  results: z.array(
                    z.object({
                      fileName: z.string(),
                      ok: z.boolean(),
                      error: z.string().optional(),
                    }),
                  ),
                }),
              ),
            },
          },
        },
        ...errors(400, 500),
      },
    }),
    validator("json", DownloadBody),
    async (c) => {
      const { files, targetDir } = c.req.valid("json")

      if (!Filesystem.contains(targetDir, targetDir)) {
        return c.json({ error: "Invalid target directory" }, 400)
      }

      const sorted = [...files].sort((a, b) => {
        const aZip = a.fileName.toLowerCase().endsWith(".zip") ? 0 : 1
        const bZip = b.fileName.toLowerCase().endsWith(".zip") ? 0 : 1
        return aZip - bZip
      })

      const firstZip = sorted.find((f) => f.fileName.toLowerCase().endsWith(".zip"))
      if (firstZip) {
        await fs.mkdir(targetDir, { recursive: true })
        let existing: string[] = []
        try {
          existing = await fs.readdir(targetDir)
        } catch {
          // dir does not exist yet
        }
        await Promise.all(existing.map((name) => fs.rm(path.join(targetDir, name), { recursive: true, force: true })))
      }

      const results = await Promise.all(
        sorted.map(async (f): Promise<{ fileName: string; ok: boolean; error?: string }> => {
          try {
            const buf = await downloadToBuffer(f.url)
            if (f.fileName.toLowerCase().endsWith(".zip")) {
              await extractZipBuffer(buf, targetDir)
            } else {
              const full = path.join(targetDir, f.fileName)
              if (!Filesystem.contains(targetDir, full)) {
                throw new Error("Access denied: path escapes target directory")
              }
              await fs.mkdir(path.dirname(full), { recursive: true })
              await fs.writeFile(full, buf)
            }
            return { fileName: f.fileName, ok: true }
          } catch (err) {
            return {
              fileName: f.fileName,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            }
          }
        }),
      )

      const allOk = results.every((r) => r.ok)
      return c.json({ results }, allOk ? 200 : 500)
    },
  ),
)
