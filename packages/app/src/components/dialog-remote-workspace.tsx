import { Component, createMemo, createSignal, Show } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Progress } from "@opencode-ai/ui/progress"
import { useGlobalSDK } from "@/context/global-sdk"
import { useGlobalSync } from "@/context/global-sync"
import { useLayout } from "@/context/layout"
import { useServer } from "@/context/server"
import { useLanguage } from "@/context/language"
import { base64Encode } from "@opencode-ai/util/encode"
import { useNavigate } from "@solidjs/router"
import { DialogSelectDirectory } from "./dialog-select-directory"
import { Icon } from "@opencode-ai/ui/icon"

interface DialogRemoteWorkspaceProps {
  url: string
  suggestedName?: string
}

function getArminCourseRoot(home: string){
  if(home.endsWith('/')){
    return home + 'armin-course'
  }else{
    return home + '/armin-course'
  }
}

type Stage = "idle" | "downloading" | "extracting" | "done" | "error"

export const DialogRemoteWorkspace: Component<DialogRemoteWorkspaceProps> = (props) => {
  const sdk = useGlobalSDK()
  const sync = useGlobalSync()
  const layout = useLayout()
  const server = useServer()
  const dialog = useDialog()
  const language = useLanguage()
  const navigate = useNavigate()

  const [stage, setStage] = createSignal<Stage>("idle")
  const [progress, setProgress] = createSignal(0)
  const [targetDir, setTargetDir] = createSignal(getArminCourseRoot(sync.data.path.home || ""))
  const [extractedPath, setExtractedPath] = createSignal("")
  const [error, setError] = createSignal("")
  const [showDirPicker, setShowDirPicker] = createSignal(false)

  const extractedPreview = createMemo(() => {
    const dir = targetDir()
    const name = props.suggestedName || getFilenameFromUrl(props.url)
    const extractedName = name.endsWith(".zip") ? name.slice(0, -4) : name
    console.log('would down '+ name);
    return dir ? `${dir}/${extractedName}` : ""
  })

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
    <Show
      when={!showDirPicker()}
      fallback={
        <DialogSelectDirectory
          title={language.t("dialog.remoteWorkspace.target")}
          multiple={false}
          onSelect={handleDirectorySelect}
        />
      }
    >
      <Dialog size="normal" fit>
        <div class="flex flex-col w-full h-full">
          <div class="flex flex-col gap-y-6 px-5 py-5">
            <div class="flex flex-col gap-y-4">
              <div class="flex flex-col gap-y-1">
                <span class="text-12-medium text-text-weak">{language.t("dialog.remoteWorkspace.url")}</span>
                <span class="text-14-regular text-text-base break-all leading-tight">{props.url}</span>
              </div>

              <div class="flex flex-col gap-y-1">
                <span class="text-12-medium text-text-weak">{language.t("dialog.remoteWorkspace.target")}</span>
                <button
                  type="button"
                  class="w-full flex items-center gap-x-3 px-3 py-2 rounded-md border border-border-base bg-surface-raised hover:bg-surface-raised-hover transition-colors"
                  onClick={() => setShowDirPicker(true)}
                >
                  <Icon name="folder" size="small" class="text-text-weak shrink-0" />
                  <span class="text-14-regular text-text-base truncate text-left flex-1 min-w-0">
                    {targetDir() || language.t("dialog.remoteWorkspace.selectDirectory")}
                  </span>
                  <Icon name="chevron-down" size="small" class="text-text-weak shrink-0" />
                </button>
              </div>

              <Show when={extractedPreview()}>
                <div class="flex flex-col gap-y-1">
                  <span class="text-12-medium text-text-weak">{language.t("dialog.remoteWorkspace.extractedTo")}</span>
                  <div class="flex items-center gap-x-2">
                    <Icon name="folder" size="small" class="text-text-weak shrink-0" />
                    <span class="text-14-regular text-text-base">{extractedPreview()}</span>
                  </div>
                </div>
              </Show>
            </div>

            <Show when={stage() === "downloading" || stage() === "extracting"}>
              <div class="flex flex-col gap-y-2">
                <Progress value={progress()} showValueLabel />
                <span class="text-12-regular text-text-weak text-center">
                  {stage() === "downloading"
                    ? language.t("dialog.remoteWorkspace.downloading")
                    : language.t("dialog.remoteWorkspace.extracting")}
                </span>
              </div>
            </Show>

            <Show when={stage() === "error"}>
              <div class="flex items-center gap-x-2 px-3 py-2 rounded-md bg-critical-subtle">
                <Icon name="circle-x" size="small" class="text-critical-base shrink-0" />
                <span class="text-14-regular text-critical-base">{error()}</span>
              </div>
            </Show>
          </div>

          <div class="flex justify-end gap-x-2 px-5 py-3 border-t border-border-base">
            <button
              type="button"
              class="px-4 py-2 text-14-regular text-text-base rounded-md hover:bg-surface-raised-hover transition-colors"
              onClick={handleCancel}
              disabled={stage() === "downloading" || stage() === "extracting"}
            >
              {language.t("common.cancel")}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-14-medium text-white rounded-md bg-color-interactive enabled:hover:bg-color-interactive-hover enabled:active:bg-color-interactive-active disabled:opacity-50 transition-colors"
              onClick={handleConfirm}
              disabled={!targetDir() || stage() === "downloading" || stage() === "extracting"}
            >
              {language.t("common.confirm")}
            </button>
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
