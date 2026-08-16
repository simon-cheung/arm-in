import { createEffect, onCleanup, type ParentProps } from "solid-js"
import { useLocation, useNavigate, useParams } from "@solidjs/router"
import { useGlobalSDK } from "@/context/global-sdk"
import { useServer } from "@/context/server"
import { useFile } from "@/context/file"
import { useReload } from "@/context/reload"
import { decode64 } from "@/utils/base64"
import { base64Encode } from "@opencode-ai/util/encode"

export function ReloadBridge(props: ParentProps) {
  const reload = useReload()
  const globalSDK = useGlobalSDK()
  const server = useServer()
  const file = useFile()
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()

  createEffect(() => {
    const off = reload.on(async (event) => {
      const directory = event.directory
      if (!directory) return
      const currentDir = params.dir ? decode64(params.dir) : ""
      if (currentDir !== directory) return
      navigate("/", { replace: true })
      await new Promise((r) => requestAnimationFrame(r))
      await globalSDK.client.instance.dispose({ directory }).catch(() => undefined)
      server.projects.close(directory)
      server.projects.open(directory)
      try {
        await Promise.race([
          file.tree.refresh(""),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10_000)),
        ])
      } catch {
        // ignore refresh error; navigate anyway
      }
      const path = location.pathname.replace(/^\/[^/]+/, "")
      const target = `/${base64Encode(directory)}${path || "/session"}`
      navigate(target, { replace: true })
    })
    onCleanup(off)
  })

  return <>{props.children}</>
}
