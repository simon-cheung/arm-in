import { UrlViewer, type UrlViewerAnyMessage } from "@/components/url-viewer"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { DialogRemoteWorkspace } from "@/components/dialog-remote-workspace"
import { useGlobalSDK } from "@/context/global-sdk"
import { decode64 } from "@/utils/base64"
import { base64Encode } from "@opencode-ai/util/encode"
import { useNavigate } from "@solidjs/router"
import { createTaskToast } from "@/utils/task-toast"
import { toaster } from "@opencode-ai/ui/toast"
import { useReload } from "@/context/reload"

const WORKDIR_RE = /\/__workdir__\/([^/?#]+)\//

export interface SessionPlaygroundTabProps {
  url: () => string
  code?: () => string | undefined
  refreshKey?: number
  fallbackDirectory?: () => string | undefined
}

export function SessionPlaygroundTab(props: SessionPlaygroundTabProps) {
  const dialog = useDialog()
  const globalSDK = useGlobalSDK()
  const reload = useReload()
  const navigate = useNavigate()

  let iframeEl: HTMLIFrameElement | undefined

  function ackIframe(fileName: string, ok: boolean, error?: string) {
    iframeEl?.contentWindow?.postMessage({ action: "ARMIN_UPSERT_DONE", fileName, ok, error }, "*")
  }

  function resolveDirectory(): string | undefined {
    const match = props.url().match(WORKDIR_RE)
    if (match) return decode64(match[1])
    return props.fallbackDirectory?.()
  }

  async function startNewSession() {
    const directory = resolveDirectory()
    if (!directory) return
    try {
      const client = globalSDK.createClient({ directory, throwOnError: true })
      const created = await client.session.create().then((x) => x.data ?? undefined)
      if (!created) throw new Error("Failed to create session")
      navigate(`/${base64Encode(directory)}/session/${created.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const toast = createTaskToast({ title: "新对话失败", description: message })
      toast.fail({
        title: "新对话失败",
        description: message,
        actions: [{ label: "Close", onClick: "dismiss" }],
      })
    }
  }

  function sortZipFirst<T extends { fileName: string }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => {
      const az = a.fileName.toLowerCase().endsWith(".zip") ? 0 : 1
      const bz = b.fileName.toLowerCase().endsWith(".zip") ? 0 : 1
      return az - bz
    })
  }

  async function handleMessage(msg: UrlViewerAnyMessage) {
    if (msg.action === "download") {
      dialog.show(
        () => <DialogRemoteWorkspace url={msg.url} suggestedName={msg.suggestedName} />,
        () => {},
      )
      return
    }

    if (msg.action === "upsert") {
      const entries: Array<{ fileName: string; url: string }> = Array.isArray(msg.files)
        ? msg.files.map((f) => ({ fileName: f.fileName, url: f.url }))
        : msg.fileName && typeof msg.content === "string"
          ? [{ fileName: msg.fileName, url: msg.content }]
          : []

      if (entries.length === 0) {
        ackIframe("", false, "no files in upsert message")
        return
      }

      const ackKey = entries.length === 1 ? entries[0].fileName : `<batch:${entries.length}>`
      const zipCount = entries.filter((f) => f.fileName.toLowerCase().endsWith(".zip")).length
      if (zipCount > 1 || (zipCount === 1 && entries.length > 1)) {
        ackIframe(ackKey, false, "batch must be all plain files or exactly one zip")
        return
      }

      await runBatch(sortZipFirst(entries), ackKey)
    }
  }

  async function runBatch(entries: Array<{ fileName: string; url: string }>, ackKey: string) {
    const directory = resolveDirectory()
    if (!directory) {
      ackIframe(ackKey, false, "Project directory not resolved")
      return
    }

    toaster.clear()
    const title =
      entries.length === 1
        ? entries[0].fileName.toLowerCase().endsWith(".zip")
          ? `Extracting ${entries[0].fileName}…`
          : `Downloading ${entries[0].fileName}…`
        : `Downloading ${entries.length} files…`
    const toast = createTaskToast({ title })

    let data: { results?: Array<{ fileName: string; ok: boolean; error?: string }> } = {}
    try {
      const response = await fetch(
        `${globalSDK.url}/experimental/remote-workspace/download?directory=${encodeURIComponent(directory)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: entries, targetDir: directory }),
        },
      )
      data = await response.json().catch(() => ({}))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      ackIframe(ackKey, false, message)
      toast.fail({
        title: "保存失败",
        description: message,
        actions: [{ label: "Close", onClick: "dismiss" }],
      })
      return
    }

    const results = Array.isArray(data.results) ? data.results : []
    const failures = results.filter((r) => !r.ok)

    if (failures.length === 0) {
      const okTitle =
        entries.length === 1
          ? entries[0].fileName.toLowerCase().endsWith(".zip")
            ? `Extracted ${entries[0].fileName}`
            : `Saved ${entries[0].fileName}`
          : `Saved ${entries.length} files`
      ackIframe(ackKey, true)
      reload.trigger({ directory, source: "upsert" })
      toast.finish({
        title: okTitle,
        actions: [
          { label: "取消", onClick: "dismiss" },
          { label: "新对话", onClick: startNewSession },
        ],
      })
      return
    }

    const description = failures.map((f) => `${f.fileName}: ${f.error ?? "failed"}`).join("\n")
    ackIframe(ackKey, false, failures[0].error)
    toast.fail({
      title: entries.length === 1 ? "保存失败" : `保存失败 (${failures.length}/${entries.length})`,
      description,
      actions: [{ label: "Close", onClick: "dismiss" }],
    })
  }

  return (
    <div class="h-full w-full">
      <UrlViewer
        url={props.url()}
        code={props.code?.()}
        refreshKey={props.refreshKey}
        onMessage={handleMessage}
        onIframeRef={(el) => {
          iframeEl = el
        }}
      />
    </div>
  )
}
