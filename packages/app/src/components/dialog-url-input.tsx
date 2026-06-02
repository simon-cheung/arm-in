import { createSignal } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"

const VALID_PROTOCOLS = ["http://", "https://", "workspace://"]

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ""

  for (const protocol of VALID_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) return trimmed
  }

  if (trimmed.startsWith("/") || trimmed.match(/^[a-zA-Z]:[\\/]/)) {
    return `workspace://${trimmed}`
  }

  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return `https://${trimmed}`
  }

  return `workspace://${trimmed}`
}

type DialogApi = ReturnType<typeof import("@opencode-ai/ui/context/dialog").useDialog>

export function DialogUrlInput(props: { dialog: DialogApi; onSubmit: (url: string) => void }) {
  const [url, setUrl] = createSignal("")
  const [error, setError] = createSignal("")

  const handleSubmit = () => {
    const value = url().trim()
    const normalized = normalizeUrl(value)
    props.onSubmit(normalized)
    props.dialog.close()
  }

  const handleClear = () => {
    props.onSubmit("")
    props.dialog.close()
  }

  return (
    <Dialog title="Enter URL">
      <div class="flex flex-col gap-4 p-4">
        <div class="flex flex-col gap-2">
          <input
            type="text"
            value={url()}
            onInput={(e) => {
              setUrl(e.currentTarget.value)
              setError("")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit()
            }}
            placeholder="https://example.com or /path/to/file"
            class="w-full px-3 py-2 rounded-md border border-border-weaker-base bg-background-stronger text-text-primary placeholder:text-text-weak focus:outline-none focus:ring-2 focus:ring-accent-default focus:border-transparent"
            autofocus
          />
          {error() && <div class="text-12-regular text-error-default">{error()}</div>}
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClear}>
            Clear
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            OK
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export function showUrlInputDialog(dialog: DialogApi, onSubmit: (url: string) => void) {
  dialog.show(
    () => <DialogUrlInput dialog={dialog} onSubmit={onSubmit} />,
    () => {},
  )
}
