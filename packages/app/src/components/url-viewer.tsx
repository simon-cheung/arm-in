import { createEffect, onCleanup } from "solid-js"

export interface UrlViewerMessage {
  action: "download"
  url: string
  suggestedName?: string
}

export interface UrlViewerUpsertFile {
  fileName: string
  url: string
}

export interface UrlViewerUpsertMessage {
  action: "upsert"
  content?: string
  fileName?: string
  files?: UrlViewerUpsertFile[]
}

export type UrlViewerAnyMessage = UrlViewerMessage | UrlViewerUpsertMessage

export function UrlViewer(props: {
  url: string
  code?: string
  refreshKey?: number
  onMessage?: (msg: UrlViewerAnyMessage) => void
  onIframeRef?: (el: HTMLIFrameElement | undefined) => void
}) {
  let iframeRef: HTMLIFrameElement | undefined
  let lastCode: string | undefined
  let lastUrl: string | undefined
  let lastRefreshKey: number | undefined

  const sendHtml = () => {
    if (!iframeRef?.contentWindow) return
    const code = props.code
    if (code !== lastCode) {
      lastCode = code
      iframeRef.contentWindow.postMessage({ type: "ARMIN_EXECUTE", code }, "*")
    }
  }

  createEffect(() => {
    if (iframeRef) iframeRef.src = props.url
    props.onIframeRef?.(iframeRef)
    onCleanup(() => {
      if (iframeRef) iframeRef.src = "about:blank"
      props.onIframeRef?.(undefined)
    })

    const handler = (e: MessageEvent) => {
      if (e.data?.action === "download") {
        props.onMessage?.({ action: "download", url: e.data.url, suggestedName: e.data.suggestedName })
      } else if (e.data?.action === "ARMIN_UPSERT_FILE") {
        if (Array.isArray(e.data.files)) {
          props.onMessage?.({ action: "upsert", files: e.data.files })
        } else {
          props.onMessage?.({ action: "upsert", content: e.data.content, fileName: e.data.fileName })
        }
      }
    }
    window.addEventListener("message", handler)
    onCleanup(() => window.removeEventListener("message", handler))
  })

  createEffect(() => {
    const url = props.url
    const refreshKey = props.refreshKey ?? 0
    if (iframeRef) {
      if (url !== lastUrl || refreshKey !== lastRefreshKey) {
        iframeRef.src = url
        lastUrl = url
        lastRefreshKey = refreshKey
      }
      lastCode = undefined
      if (props.code) {
        sendHtml()
      }
    }
  })

  createEffect(() => {
    const code = props.code
    if (code) {
      sendHtml()
    }
  })

  const handleLoad = () => {
    sendHtml()
  }

  return (
    <div class="url-viewer h-full w-full">
      <iframe
        ref={iframeRef}
        class="w-full h-full border-0"
        onLoad={handleLoad}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
      />
    </div>
  )
}
