import { createEffect, onMount } from "solid-js"

export function UrlViewer(props: { url: string; html?: string }) {
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
  })

  createEffect(() => {
    const url = props.url
    if (iframeRef) {
      if(url !== lastUrl) {
        iframeRef.src = url
        lastUrl = url
      }else{
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
