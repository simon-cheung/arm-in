import { createEffect, onMount } from "solid-js"

export interface UrlViewerMessage {
  action: "download"
  url: string
  suggestedName?: string
}

export function UrlViewer(props: { url: string; html?: string; onMessage?: (msg: UrlViewerMessage) => void }) {
  let iframeRef: HTMLIFrameElement | undefined
  let lastHtml: string | undefined
  let lastUrl: string | undefined

  const sendHtml = () => {
    if (!iframeRef?.contentWindow) return
    const html = props.html
    if (html !== lastHtml) {
      lastHtml = html
      iframeRef.contentWindow.postMessage({ type: "playground.html", html }, "*")
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
    if (iframeRef) {
      if (url !== lastUrl) {
        iframeRef.src = url
        lastUrl = url
      } else {
        console.log("[UrlViewer] URL unchanged, not updating iframe src")
      }
      lastHtml = undefined
      if (props.html) {
        sendHtml()
      }
    }
  })

  createEffect(() => {
    const html = props.html
    if (html) {
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
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
