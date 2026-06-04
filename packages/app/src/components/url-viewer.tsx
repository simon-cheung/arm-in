import { createEffect, onMount } from "solid-js"

export interface UrlViewerMessage {
  action: "download"
  url: string
  suggestedName?: string
}

export function UrlViewer(props: {
  url: string
  code?: string
  refreshKey?: number
  onMessage?: (msg: UrlViewerMessage) => void
}) {
  let iframeRef: HTMLIFrameElement | undefined
  let lastCode: string | undefined
  let lastUrl: string | undefined
  let lastRefreshKey: number | undefined

  const sendHtml = () => {
    if (!iframeRef?.contentWindow) return
    const code = props.code
    console.log("[UrlViewer] update code: ", code)
    if (code !== lastCode) {
      lastCode = code
      iframeRef.contentWindow.postMessage({ type: "ARMIN_EXECUTE", code }, "*")
    }
  }

  onMount(() => {
    if (iframeRef) iframeRef.src = props.url

    const handleMessage = (e: MessageEvent) => {
      console.log("[UrlViewer] Received message:", e.data)
      if (e.data?.action === "download") {
        console.log("[UrlViewer] Download action detected, calling onMessage")
        props.onMessage?.({ action: "download", url: e.data.url, suggestedName: e.data.suggestedName })
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  })

  createEffect(() => {
    const url = props.url
    const refreshKey = props.refreshKey ?? 0
    if (iframeRef) {
      if (url !== lastUrl || refreshKey !== lastRefreshKey) {
        iframeRef.src = url
        lastUrl = url
        lastRefreshKey = refreshKey
      } else {
        console.log("[UrlViewer] URL unchanged, not updating iframe src")
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
