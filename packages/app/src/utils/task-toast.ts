import { showToast, toaster } from "@opencode-ai/ui/toast"
import type { ToastAction, ToastVariant } from "@opencode-ai/ui/toast"

export interface TaskToastOptions {
  title: string
  description?: string
  actions?: ToastAction[]
}

export interface TaskToastHandle {
  update(opts: { title?: string; description?: string }): void
  finish(opts: TaskToastOptions): void
  fail(opts: TaskToastOptions): void
  dismiss(): void
}

function show(variant: ToastVariant, opts: TaskToastOptions, icon?: "circle-check" | "circle-x"): number {
  return showToast({
    title: opts.title,
    description: opts.description,
    icon,
    variant,
    persistent: true,
    actions: opts.actions,
  })
}

export function createTaskToast(initial: TaskToastOptions): TaskToastHandle {
  let id: number | undefined = show("loading", initial)
  return {
    update(opts) {
      if (id) toaster.dismiss(id)
      id = show("loading", { title: opts.title ?? "", description: opts.description })
    },
    finish(opts) {
      if (id) toaster.dismiss(id)
      id = show("success", opts, "circle-check")
    },
    fail(opts) {
      if (id) toaster.dismiss(id)
      id = show("error", opts, "circle-x")
    },
    dismiss() {
      if (id) toaster.dismiss(id)
      id = undefined
    },
  }
}
