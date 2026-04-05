import path from "path"
import { mkdir } from "fs/promises"
import { Instance } from "@/project/instance"
import { Filesystem } from "@/util/filesystem"
import { PromptRegistry } from "./registry"

const PROMPTS_DIR = ".opencode/prompts"
const SCAFFOLD_MARKER = ".scaffolded"

export namespace PromptScaffold {
  function getMarkerPath(): string {
    return path.join(Instance.directory, PROMPTS_DIR, SCAFFOLD_MARKER)
  }

  function getPromptsDir(): string {
    return path.join(Instance.directory, PROMPTS_DIR)
  }

  export async function isScaffolded(): Promise<boolean> {
    return Filesystem.exists(getMarkerPath())
  }

  export async function ensureCriticalPrompts(): Promise<void> {
    await scaffold()
  }

  export async function scaffold(): Promise<void> {
    const promptsDir = getPromptsDir()
    const markerPath = getMarkerPath()

    const entries = PromptRegistry.list()
    const categories = new Set(entries.map((e) => path.dirname(e.workspacePath)))

    for (const cat of categories) {
      const catPath = path.join(promptsDir, cat)
      if (!(await Filesystem.exists(catPath))) {
        await mkdir(catPath, { recursive: true })
      }
    }

    for (const entry of entries) {
      const filePath = path.join(promptsDir, entry.workspacePath)
      if (!(await Filesystem.exists(filePath))) {
        await Bun.write(filePath, entry.builtIn)
      }
    }

    if (!(await Filesystem.exists(markerPath))) {
      await Bun.write(
        markerPath,
        JSON.stringify({
          version: 1,
          scaffoldedAt: new Date().toISOString(),
        }),
      )
    }
  }
}
