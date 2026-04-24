import { type JSX } from "solid-js"
import { UrlViewer } from "@/components/url-viewer"

export interface SessionPlaygroundTabProps {
  url: () => string
  html?: () => string | undefined
}

export function SessionPlaygroundTab(props: SessionPlaygroundTabProps) {
  return (
    <div class="h-full w-full">
      <UrlViewer url={props.url()} html={props.html?.()} />
    </div>
  )
}
