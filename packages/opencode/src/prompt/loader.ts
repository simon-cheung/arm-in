import path from "path"
import { Instance } from "@/project/instance"
import { Filesystem } from "@/util/filesystem"
import { PromptRegistry } from "./registry"

const PROMPTS_DIR = ".opencode/prompts"

const syncCache = new Map<string, string>()
const asyncCache = new Map<string, Promise<string>>()

export namespace PromptLoader {
  function getWorkspacePromptPath(name: string): string {
    const entry = PromptRegistry.get(name)
    if (!entry) throw new Error(`Unknown prompt: ${name}`)
    return path.join(Instance.directory, PROMPTS_DIR, entry.workspacePath)
  }

  export async function preload(): Promise<void> {
    const entries = PromptRegistry.list()
    await Promise.all(
      entries.map(async (entry) => {
        const workspacePath = path.join(Instance.directory, PROMPTS_DIR, entry.workspacePath)
        if (await Filesystem.exists(workspacePath)) {
          const content = await Bun.file(workspacePath).text()
          syncCache.set(entry.name, content)
        } else {
          syncCache.set(entry.name, entry.builtIn)
        }
      }),
    )
  }

  export function get(name: string): string {
    const cached = syncCache.get(name)
    if (cached) return cached
    const entry = PromptRegistry.get(name)
    if (!entry) throw new Error(`Unknown prompt: ${name}`)
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
    const cached = asyncCache.get(name)
    if (cached) return cached

    const loadPromise = (async () => {
      const entry = PromptRegistry.get(name)
      if (!entry) throw new Error(`Unknown prompt: ${name}`)

      const workspacePath = getWorkspacePromptPath(name)
      if (await Filesystem.exists(workspacePath)) {
        const content = await Bun.file(workspacePath).text()
        return content
      }

      return entry.builtIn
    })()

    asyncCache.set(name, loadPromise)
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
    asyncCache.clear()
  }

  export function clearCacheFor(name: string): void {
    syncCache.delete(name)
    asyncCache.delete(name)
  }
}
