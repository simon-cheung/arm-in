import { createSimpleContext } from "@opencode-ai/ui/context"

export interface ReloadEvent {
  directory: string
  source?: string
}

export const { use: useReload, provider: ReloadProvider } = createSimpleContext({
  name: "Reload",
  init: () => {
    const listeners = new Set<(e: ReloadEvent) => void>()
    return {
      trigger(event: ReloadEvent) {
        for (const cb of listeners) cb(event)
      },
      on(cb: (e: ReloadEvent) => void): () => void {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
    }
  },
})
