import path from "path"
import { Instance } from "@/project/instance"
import { Filesystem } from "@/util/filesystem"
import { PromptRegistry } from "./registry"

const PROMPTS_DIR = ".opencode/prompts"

const syncCache = new Map<string, string>()

export namespace PromptLoader {
  function getWorkspacePromptPath(name: string): string {
    const entry = PromptRegistry.get(name)
    if (!entry) throw new Error(`Unknown prompt: ${name}`)
    return path.join(Instance.directory, PROMPTS_DIR, entry.workspacePath)
  }

  async function loadLatest(entry: any): Promise<string> {
    let filepath_user = PromptRegistry.getEntryPathLatest(entry, path.join(Instance.directory, PROMPTS_DIR))

    if (await Filesystem.exists(filepath_user)) {
      const content = await Bun.file(filepath_user).text()
      return content
    }
    return entry.builtIn
  }

  export async function preload(): Promise<void> {
    const entries = PromptRegistry.list()
    await Promise.all(
      entries.map(async (entry) => {
        const content = await loadLatest(entry)
        if(content.length != entry.builtIn.length){
          console.log(`Preloaded prompt: ${entry.name}, length differs from built-in`)
        }
        syncCache.set(entry.name, content)
      }),
    )
  }

  export function get(name: string): string {
    const cached = syncCache.get(name)
    if (cached) return cached
    const entry = PromptRegistry.get(name)
    if (!entry) {
      // console.warn(`Prompt ${name} not found in registry, returning empty string`)
      return ""
    }
    return entry.builtIn
  }

  export function buildWithVars(
    content: string,
    vars: Record<string, string>,
  ): string {
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value)
    }
    return content
  }

  export function getWithVars(
    name: string,
    vars: Record<string, string>,
  ): string {
    let content =  get(name)
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value)
    }
    return content
  }

  export async function load(name: string): Promise<string> {
    const cached = syncCache.get(name)
    if (cached) return cached

    const entry = PromptRegistry.get(name)
    if (!entry) throw new Error(`Unknown prompt: ${name}`)
    const loadPromise = await loadLatest(entry)
    syncCache.set(name, loadPromise)
    return loadPromise
  }

  export async function loadWithVars(
    name: string,
    vars: Record<string, string>,
  ): Promise<string> {
    let content = await load(name)
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value)
    }
    return content
  }

  export function getBuiltIn(name: string): string {
    const entry = PromptRegistry.get(name)
    if (!entry) throw new Error(`Unknown prompt: ${name}`)
    return entry.builtIn
  }

  export async function exists(name: string): Promise<boolean> {
    const workspacePath = getWorkspacePromptPath(name)
    return Filesystem.exists(workspacePath)
  }

  export function clearCache(): void {
    syncCache.clear()
  }

  export function clearCacheFor(name: string): void {
    syncCache.delete(name)
  }
}
