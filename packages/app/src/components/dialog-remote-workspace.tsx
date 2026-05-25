import { createSignal, Show } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Progress } from "@opencode-ai/ui/progress"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { useGlobalSDK } from "@/context/global-sdk"
import { useGlobalSync } from "@/context/global-sync"
import { useLayout } from "@/context/layout"
import { useServer } from "@/context/server"
import { useLanguage } from "@/context/language"
import { base64Encode } from "@opencode-ai/util/encode"
import { useNavigate } from "@solidjs/router"
import { DialogSelectDirectory } from "./dialog-select-directory"

interface DialogRemoteWorkspaceProps {
  url: string
  suggestedName?: string
}

type Stage = "idle" | "downloading" | "extracting" | "done" | "error"

export function DialogRemoteWorkspace(props: DialogRemoteWorkspaceProps) {
  const sdk = useGlobalSDK()
  const sync = useGlobalSync()
  const layout = useLayout()
  const server = useServer()
  const dialog = useDialog()
  const language = useLanguage()
  const navigate = useNavigate()

  const [stage, setStage] = createSignal<Stage>("idle")
  const [progress, setProgress] = createSignal(0)
  const [targetDir, setTargetDir] = createSignal(sync.data.path.home || sync.data.path.directory || "")
  const [extractedPath, setExtractedPath] = createSignal("")
  const [error, setError] = createSignal("")
  const [showDirPicker, setShowDirPicker] = createSignal(false)

  const home = () => sync.data.path.home || ""
  const start = () => sync.data.path.home || sync.data.path.directory || ""

  const extractedPreview = () => {
    const dir = targetDir()
    const name = props.suggestedName || getFilenameFromUrl(props.url)
    const extractedName = name.endsWith(".zip") ? name.slice(0, -4) : name
    return dir ? `${dir}/${extractedName}` : ""
  }

  async function handleConfirm() {
    const dir = targetDir()
    if (!dir) return

    setStage("downloading")
    setProgress(0)

    try {
      const response = await fetch(`${sdk.url}/experimental/remote-workspace/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: props.url, targetDir: dir }),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      const extracted = result.path
      setExtractedPath(extracted)
      setStage("done")

      layout.projects.open(extracted)
      server.projects.touch(extracted)
      navigate(`/${base64Encode(extracted)}`)

      dialog.close()
    } catch (err) {
      console.error(`[DialogRemoteWorkspace] Error:`, err)
      setStage("error")
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleCancel() {
    dialog.close()
  }

  function handleDirectorySelect(result: string | string[] | null) {
    if (result && !Array.isArray(result)) {
      setTargetDir(result)
    }
    setShowDirPicker(false)
  }

  return (
    <Show when={!showDirPicker()}>
      <Dialog
        title={language.t("dialog.remoteWorkspace.title")}
        action={
          <Button
            variant="primary"
            disabled={!targetDir() || stage() === "downloading" || stage() === "extracting"}
            onClick={handleConfirm}
          >
            {language.t("common.confirm")}
          </Button>
        }
      >
        <div class="flex flex-col gap-y-4 min-w-96">
          <div class="flex flex-col gap-y-1">
            <span class="text-12-regular text-text-weak">{language.t("dialog.remoteWorkspace.url")}</span>
            <span class="text-14-regular text-text-base break-all">{props.url}</span>
          </div>

          <div class="flex flex-col gap-y-1">
            <span class="text-12-regular text-text-weak">{language.t("dialog.remoteWorkspace.target")}</span>
            <div class="flex items-center gap-x-2">
              <span class="text-14-regular text-text-base break-all flex-1 min-w-0">{targetDir() || "-"}</span>
              <Button variant="ghost" size="small" onClick={() => setShowDirPicker(true)}>
                {language.t("common.change")}
              </Button>
            </div>
          </div>

          <Show when={extractedPreview()}>
            <div class="flex flex-col gap-y-1">
              <span class="text-12-regular text-text-weak">{language.t("dialog.remoteWorkspace.extractedTo")}</span>
              <span class="text-14-regular text-text-base">{extractedPreview()}</span>
            </div>
          </Show>

          <Show when={stage() === "downloading" || stage() === "extracting"}>
            <div class="flex flex-col gap-y-2">
              <Progress value={progress()} showValueLabel />
              <span class="text-12-regular text-text-weak">
                {stage() === "downloading"
                  ? language.t("dialog.remoteWorkspace.downloading")
                  : language.t("dialog.remoteWorkspace.extracting")}
              </span>
            </div>
          </Show>

          <Show when={stage() === "error"}>
            <div class="flex items-center gap-x-2 text-critical-base">
              <Icon name="circle-x" size="small" />
              <span class="text-14-regular">{error()}</span>
            </div>
          </Show>

          <div class="flex justify-end gap-x-2">
            <Button variant="ghost" onClick={handleCancel}>
              {language.t("common.cancel")}
            </Button>
          </div>
        </div>
      </Dialog>
    </Show>
  )
}

function getFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const segments = u.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1] || "download"
  } catch {
    return "download"
  }
}
