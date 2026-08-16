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
}

export function SessionPlaygroundTab(props: SessionPlaygroundTabProps) {
  const dialog = useDialog()
  const globalSDK = useGlobalSDK()
  const reload = useReload()
  const navigate = useNavigate()

  let inflight = false
  let iframeEl: HTMLIFrameElement | undefined

  function ackIframe(fileName: string, ok: boolean, error?: string) {
    iframeEl?.contentWindow?.postMessage({ action: "ARMIN_UPSERT_DONE", fileName, ok, error }, "*")
  }

  function resolveDirectory(): string | undefined {
    const match = props.url().match(WORKDIR_RE)
    if (!match) return undefined
    return decode64(match[1])
  }

  function instanceClient() {
    const directory = resolveDirectory()
    return directory ? globalSDK.createClient({ directory, throwOnError: true }) : globalSDK.client
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

  async function handleMessage(msg: UrlViewerAnyMessage) {
    if (msg.action === "download") {
      dialog.show(
        () => <DialogRemoteWorkspace url={msg.url} suggestedName={msg.suggestedName} />,
        () => {},
      )
      return
    }

    if (msg.action === "upsert") {
      if (inflight) return
      inflight = true
      try {
        const fileName = msg.fileName
        const target = msg.content
        if (fileName.toLowerCase().endsWith(".zip")) {
          await extractZip(fileName, target)
        } else {
          await writeFile(fileName, target)
        }
      } finally {
        inflight = false
      }
    }
  }

  async function writeFile(fileName: string, expected: string) {
    const directory = resolveDirectory()
    toaster.clear()
    const toast = createTaskToast({ title: `Saving ${fileName}…` })
    try {
      await instanceClient().file.write({
        path: fileName,
        content: expected,
      })
      const readRes = await instanceClient().file.read({ path: fileName })
      const actual = readRes.data?.content
      if (actual !== expected) {
        throw new Error(`Read-back mismatch (expected ${expected.length} bytes, got ${actual?.length ?? 0})`)
      }
      toast.update({ title: "重新加载项目…" })
      if (directory) reload.trigger({ directory, source: "upsert" })
      toast.finish({
        title: `Saved ${fileName}`,
        actions: [
          { label: "取消", onClick: "dismiss" },
          { label: "新对话", onClick: startNewSession },
        ],
      })
      ackIframe(fileName, true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.fail({
        title: "保存失败",
        description: message,
        actions: [{ label: "Close", onClick: "dismiss" }],
      })
      ackIframe(fileName, false, message)
    }
  }

  async function extractZip(fileName: string, url: string) {
    const directory = resolveDirectory()
    if (!directory) {
      toaster.clear()
      const toast = createTaskToast({ title: "Project directory not resolved" })
      toast.fail({ title: "Project directory not resolved" })
      ackIframe(fileName, false, "Project directory not resolved")
      return
    }
    toaster.clear()
    const toast = createTaskToast({ title: `Extracting ${fileName}…` })
    try {
      const response = await fetch(
        `${globalSDK.url}/experimental/remote-workspace/download?directory=${encodeURIComponent(directory)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, targetDir: directory }),
        },
      )
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.error) throw new Error(result.error ?? `HTTP ${response.status}`)

      toast.update({ title: "重新加载项目…" })
      reload.trigger({ directory, source: "upsert" })

      toast.finish({
        title: `Extracted ${fileName}`,
        actions: [
          { label: "取消", onClick: "dismiss" },
          { label: "新对话", onClick: startNewSession },
        ],
      })
      ackIframe(fileName, true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.fail({
        title: "解压失败",
        description: message,
        actions: [{ label: "Close", onClick: "dismiss" }],
      })
      ackIframe(fileName, false, message)
    }
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
