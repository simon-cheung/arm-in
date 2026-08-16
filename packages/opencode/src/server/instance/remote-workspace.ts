import { Hono } from "hono"
import { describeRoute, validator } from "hono-openapi"
import { resolver } from "hono-openapi"
import z from "zod"
import { errors } from "../error"
import { lazy } from "../../util/lazy"
import { downloadAndExtract, type DownloadStage } from "../../util/download"

const DownloadBody = z.object({
  url: z.string().url(),
  targetDir: z.string(),
})

export const RemoteWorkspaceRoutes = lazy(() =>
  new Hono().post(
    "/download",
    describeRoute({
      summary: "Download and extract a remote workspace",
      description: "Download a zip file from a URL and extract it to a target directory.",
      operationId: "experimental.remoteWorkspace.download",
      responses: {
        200: {
          description: "Extracted directory path",
          content: {
            "application/json": {
              schema: resolver(z.object({ path: z.string() })),
            },
          },
        },
        ...errors(400, 500),
      },
    }),
    validator("json", DownloadBody),
    async (c) => {
      const { url, targetDir } = c.req.valid("json")

      try {
        const extractedPath = await downloadAndExtract(url, targetDir, (stage: DownloadStage, percent?: number) => {
        })

        return c.json({ path: extractedPath })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return c.json({ error: message }, 500)
      }
    },
  ),
)
