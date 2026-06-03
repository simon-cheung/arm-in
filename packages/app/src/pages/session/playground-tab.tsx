import { type JSX, Show } from "solid-js"
import { UrlViewer, type UrlViewerMessage } from "@/components/url-viewer"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { DialogRemoteWorkspace } from "@/components/dialog-remote-workspace"

export interface SessionPlaygroundTabProps {
  url: () => string
  code?: () => string | undefined
  refreshKey?: number
}

export function SessionPlaygroundTab(props: SessionPlaygroundTabProps) {
  const dialog = useDialog()

  function handleMessage(msg: UrlViewerMessage) {
    if (msg.action === "download") {
      dialog.show(
        () => <DialogRemoteWorkspace url={msg.url} suggestedName={msg.suggestedName} />,
        () => {},
      )
    }
  }

  return (
    <div class="h-full w-full">
      <UrlViewer url={props.url()} code={props.code?.()} refreshKey={props.refreshKey} onMessage={handleMessage} />
    </div>
  )
}
