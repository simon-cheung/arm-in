import path from "path"
import { mkdir } from "fs/promises"
import { Instance } from "@/project/instance"
import { Filesystem } from "@/util/filesystem"
import { PromptRegistry } from "./registry"
import { Installation } from "@/installation"

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

  export async function checkScaffold(): Promise<void> {
    const promptsDir = getPromptsDir()
    const markerPath = getMarkerPath()

    if (await Filesystem.exists(markerPath)) {
      let markerContent = await Bun.file(markerPath).text()
      try {
        const markerJson = JSON.parse(markerContent)
        if(markerJson.version === Installation.VERSION){
          return
        }
      } catch (e) {
      }
    }

    const entries = PromptRegistry.list()
    const categories = new Set(entries.map((e) => path.dirname(e.workspacePath)))

    for (const cat of categories) {
      const catPath = path.join(promptsDir, cat)
      if (!(await Filesystem.exists(catPath))) {
        await mkdir(catPath, { recursive: true })
      }
    }

    for (const entry of entries) {
      const filePath = PromptRegistry.getEntryPathForScaffoldWrite(entry, promptsDir)
      if (!(await Filesystem.exists(filePath))) {
        await Bun.write(filePath, entry.builtIn)
      }
    }

    await Bun.write(
      markerPath,
      JSON.stringify({
        version: `${Installation.VERSION}`,
        scaffoldedAt: new Date().toISOString(),
        tips: "Do not Edit the scaffolded prompts directly. If you want to customize, please copy the content to a new file with the same name but with '-user' suffix before the extension, and edit the new file.",
      }),
    )    
  }
}
