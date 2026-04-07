import { Instance } from "../project/instance"

import { PromptLoader } from "@/prompt"

import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Skill } from "@/skill"

export namespace SystemPrompt {
  const PROVIDER_MAP: Array<{ pattern: (id: string) => boolean; name: string }> = [
    { pattern: (id) => id.includes("gpt-4") || id.includes("o1") || id.includes("o3"), name: "beast" },
    { pattern: (id) => id.includes("codex"), name: "codex" },
    { pattern: (id) => id.includes("gpt"), name: "gpt" },
    { pattern: (id) => id.includes("gemini-"), name: "gemini" },
    { pattern: (id) => id.includes("claude"), name: "anthropic" },
    { pattern: (id) => id.toLowerCase().includes("trinity"), name: "trinity" },
    { pattern: (id) => id.toLowerCase().includes("kimi"), name: "kimi" },
  ]

  export function provider(model: Provider.Model): string[] {
    const name = PROVIDER_MAP.find((p) => p.pattern(model.api.id))?.name ?? "default"
    const prompt = PromptLoader.get(`system.${name}`)
    return [prompt]
  }

  export async function environment(model: Provider.Model): Promise<string[]> {
    const project = Instance.project
    const template = PromptLoader.get("system.system-environment")
    const content = template
      .replace(/\$\{model_id\}/g, model.api.id)
      .replace(/\$\{provider_id\}/g, model.providerID)
      .replace(/\$\{directory\}/g, Instance.directory)
      .replace(/\$\{worktree\}/g, Instance.worktree)
      .replace(/\$\{is_git_repo\}/g, project.vcs === "git" ? "yes" : "no")
      .replace(/\$\{platform\}/g, process.platform)
      .replace(/\$\{date\}/g, new Date().toDateString())
    return [content]
  }

  export async function skills(agent: Agent.Info): Promise<string[] | undefined> {
    if (Permission.disabled(["skill"], agent.permission).has("skill")) return undefined

    const list = await Skill.available(agent)
    const template = PromptLoader.get("system.system-skills")
    const skillsList = Skill.fmt(list, { verbose: true })
    const content = template.replace(/\$\{skills_list\}/g, skillsList)
    return [content]
  }
}
