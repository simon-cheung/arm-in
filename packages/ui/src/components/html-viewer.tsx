import { createEffect, onMount } from "solid-js"
import { type FileContents } from "@pierre/diffs"
import { base64Encode } from "@opencode-ai/util/encode"
import "./html-viewer.css"

export function HtmlViewer(props: {
  file: FileContents
  path?: string
  directory?: string
  serverUrl?: string
  serverUsername?: string
  serverPassword?: string
}) {
  let iframeRef: HTMLIFrameElement | undefined

  const getSrc = () => {
    console.log(`[HtmlViewer.getSrc] props.path=${props.path}, props.directory=${props.directory}`)
    if (!props.path) return "about:blank"

    // props.path could be:
    // 1. Absolute path like /Users/xxx/project/.apps/foo/bar.html
    // 2. Relative path like .apps/foo/bar.html

    // Find the .apps/ portion
    const appsIndex = props.path.indexOf(".apps/")
    console.log(`[HtmlViewer.getSrc] appsIndex=${appsIndex}`)
    if (appsIndex === -1) {
      // No .apps/ in path, can't determine workspace
      return "about:blank"
    }

    // workspaceDir is everything before .apps/
    let workspaceDir = props.path.substring(0, appsIndex)
    // relativePath is the part after .apps/
    let relativePath = props.path.substring(appsIndex + ".apps/".length)
    console.log(`[HtmlViewer.getSrc] workspaceDir="${workspaceDir}", relativePath="${relativePath}"`)

    // If workspaceDir is empty, .apps/ is at the start of the path
    // We need to use props.directory as the workspace
    if (!workspaceDir && props.directory) {
      workspaceDir = props.directory
    } else if (!workspaceDir) {
      // Still no workspace directory available
      console.log(`[HtmlViewer.getSrc] workspaceDir empty, props.directory=${props.directory}, returning about:blank`)
      return "about:blank"
    }

    // Normalize Windows backslashes to forward slashes
    workspaceDir = workspaceDir.replace(/\\/g, "/")

    // Check if workspaceDir is an absolute path (Unix / or Windows E:/ C:/ etc)
    const isAbsolute = workspaceDir.startsWith("/") || /^[a-zA-Z]:/.test(workspaceDir)
    if (!isAbsolute) {
      console.log(`[HtmlViewer.getSrc] workspaceDir not absolute: ${workspaceDir}, returning about:blank`)
      return "about:blank"
    }

    // Base64 encode the workspace directory
    const encodedDir = base64Encode(workspaceDir)
    const url = buildUrl(`/.apps/${encodedDir}/${relativePath}`)
    console.log(`[HtmlViewer.getSrc] final url=${url}`)
    return url
  }

  const buildUrl = (path: string) => {
    // Use serverUrl if provided, otherwise use current page's origin with port 4096
    const base = props.serverUrl
      ? `${props.serverUrl}${path}`
      : (() => {
          const url = new URL(location.origin)
          url.port = "4096"
          return `${url.origin}${path}`
        })()

    if (props.serverUsername && props.serverPassword) {
      const url = new URL(base)
      url.searchParams.set("auth_token", btoa(`${props.serverUsername}:${props.serverPassword}`))
      return url.toString()
    }

    return base
  }

  onMount(() => {
    if (iframeRef) iframeRef.src = getSrc()
  })

  createEffect(() => {
    if (iframeRef) iframeRef.src = getSrc()
  })

  return (
    <div class="html-viewer">
      <iframe ref={iframeRef} class="html-viewer-iframe" />
    </div>
  )
}
