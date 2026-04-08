import path from "path"

import PROMPT_ANTHROPIC from "../session/prompt/anthropic.txt"
import PROMPT_DEFAULT from "../session/prompt/default.txt"
import PROMPT_BEAST from "../session/prompt/beast.txt"
import PROMPT_GEMINI from "../session/prompt/gemini.txt"
import PROMPT_GPT from "../session/prompt/gpt.txt"
import PROMPT_KIMI from "../session/prompt/kimi.txt"
import PROMPT_CODEX from "../session/prompt/codex.txt"
import PROMPT_TRINITY from "../session/prompt/trinity.txt"
import PROMPT_PLAN from "../session/prompt/plan.txt"
import PLAN_MODE from "../session/prompt/plan-mode.txt"
import BUILD_SWITCH from "../session/prompt/plan-build-switch.txt"
import MAX_STEPS from "../session/prompt/max-steps.txt"
import PROMPT_COMPACTION from "../agent/prompt/compaction.txt"
import PROMPT_EXPLORE from "../agent/prompt/explore.txt"
import PROMPT_SUMMARY from "../agent/prompt/summary.txt"
import PROMPT_TITLE from "../agent/prompt/title.txt"
import TOOL_BASH from "../tool/bash.txt"
import TOOL_READ from "../tool/read.txt"
import TOOL_EDIT from "../tool/edit.txt"
import TOOL_WRITE from "../tool/write.txt"
import TOOL_GLOB from "../tool/glob.txt"
import TOOL_GREP from "../tool/grep.txt"
import TOOL_TASK from "../tool/task.txt"
import TOOL_WEBFETCH from "../tool/webfetch.txt"
import TOOL_WEBSEARCH from "../tool/websearch.txt"
import TOOL_QUESTION from "../tool/question.txt"
import TOOL_TODOWRITE from "../tool/todowrite.txt"
import TOOL_LS from "../tool/ls.txt"
import TOOL_LSP from "../tool/lsp.txt"
import TOOL_MULTIEDIT from "../tool/multiedit.txt"
import TOOL_CODESEARCH from "../tool/codesearch.txt"
import TOOL_APPLY_PATCH from "../tool/apply_patch.txt"
import TOOL_PLAN_EXIT from "../tool/plan-exit.txt"
import PROMPT_INITIALIZE from "../command/template/initialize.txt"
import PROMPT_REVIEW from "../command/template/review.txt"
import PROMPT_GENERATE from "../agent/generate.txt"
import SYSTEM_ENVIRONMENT from "../session/prompt/system-environment.txt"
import SYSTEM_SKILLS from "../session/prompt/system-skills.txt"
import TOOL_STRUCTURED_OUTPUT from "../tool/structured-output.txt"
import STRUCTURED_OUTPUT_SYSTEM from "../session/prompt/structured-output-system.txt"
import type { Any } from "effect/Schema"

export namespace PromptRegistry {
  export type Category = "system" | "reminder" | "agent" | "tool" | "command" | "other"

  export interface Entry {
    category: Category
    name: string
    builtIn: string
    workspacePath: string
  }

  const entries: Entry[] = [
    // System prompts
    { category: "system", name: "system.anthropic", builtIn: PROMPT_ANTHROPIC, workspacePath: "system/anthropic.txt" },
    { category: "system", name: "system.gpt", builtIn: PROMPT_GPT, workspacePath: "system/gpt.txt" },
    { category: "system", name: "system.gemini", builtIn: PROMPT_GEMINI, workspacePath: "system/gemini.txt" },
    { category: "system", name: "system.kimi", builtIn: PROMPT_KIMI, workspacePath: "system/kimi.txt" },
    { category: "system", name: "system.beast", builtIn: PROMPT_BEAST, workspacePath: "system/beast.txt" },
    { category: "system", name: "system.codex", builtIn: PROMPT_CODEX, workspacePath: "system/codex.txt" },
    { category: "system", name: "system.trinity", builtIn: PROMPT_TRINITY, workspacePath: "system/trinity.txt" },
    { category: "system", name: "system.default", builtIn: PROMPT_DEFAULT, workspacePath: "system/default.txt" },
    {
      category: "system",
      name: "system.plan-build-switch",
      builtIn: BUILD_SWITCH,
      workspacePath: "system/plan-build-switch.txt",
    },
    { category: "system", name: "system.max-steps", builtIn: MAX_STEPS, workspacePath: "system/max-steps.txt" },
    {
      category: "system",
      name: "system.system-environment",
      builtIn: SYSTEM_ENVIRONMENT,
      workspacePath: "system/system-environment.txt",
    },
    {
      category: "system",
      name: "system.system-skills",
      builtIn: SYSTEM_SKILLS,
      workspacePath: "system/system-skills.txt",
    },
    {
      category: "system",
      name: "system.structured-output-system",
      builtIn: STRUCTURED_OUTPUT_SYSTEM,
      workspacePath: "system/structured-output-system.txt",
    },
    { category: "reminder", name: "reminder.plan", builtIn: PROMPT_PLAN, workspacePath: "reminder/plan.txt" },
    { category: "reminder", name: "reminder.plan-mode", builtIn: PLAN_MODE, workspacePath: "reminder/plan-mode.txt" },

    // Agent prompts
    { category: "agent", name: "agent.explore", builtIn: PROMPT_EXPLORE, workspacePath: "agent/explore.txt" },
    { category: "agent", name: "agent.compaction", builtIn: PROMPT_COMPACTION, workspacePath: "agent/compaction.txt" },
    { category: "agent", name: "agent.summary", builtIn: PROMPT_SUMMARY, workspacePath: "agent/summary.txt" },
    { category: "agent", name: "agent.title", builtIn: PROMPT_TITLE, workspacePath: "agent/title.txt" },
    { category: "agent", name: "agent.generate", builtIn: PROMPT_GENERATE, workspacePath: "agent/generate.txt" },

    // Tool descriptions
    { category: "tool", name: "tool.bash", builtIn: TOOL_BASH, workspacePath: "tool/bash.txt" },
    { category: "tool", name: "tool.read", builtIn: TOOL_READ, workspacePath: "tool/read.txt" },
    { category: "tool", name: "tool.edit", builtIn: TOOL_EDIT, workspacePath: "tool/edit.txt" },
    { category: "tool", name: "tool.write", builtIn: TOOL_WRITE, workspacePath: "tool/write.txt" },
    { category: "tool", name: "tool.glob", builtIn: TOOL_GLOB, workspacePath: "tool/glob.txt" },
    { category: "tool", name: "tool.grep", builtIn: TOOL_GREP, workspacePath: "tool/grep.txt" },
    { category: "tool", name: "tool.task", builtIn: TOOL_TASK, workspacePath: "tool/task.txt" },
    { category: "tool", name: "tool.webfetch", builtIn: TOOL_WEBFETCH, workspacePath: "tool/webfetch.txt" },
    { category: "tool", name: "tool.websearch", builtIn: TOOL_WEBSEARCH, workspacePath: "tool/websearch.txt" },
    { category: "tool", name: "tool.question", builtIn: TOOL_QUESTION, workspacePath: "tool/question.txt" },
    { category: "tool", name: "tool.todowrite", builtIn: TOOL_TODOWRITE, workspacePath: "tool/todowrite.txt" },
    { category: "tool", name: "tool.ls", builtIn: TOOL_LS, workspacePath: "tool/ls.txt" },
    { category: "tool", name: "tool.lsp", builtIn: TOOL_LSP, workspacePath: "tool/lsp.txt" },
    { category: "tool", name: "tool.multiedit", builtIn: TOOL_MULTIEDIT, workspacePath: "tool/multiedit.txt" },
    { category: "tool", name: "tool.codesearch", builtIn: TOOL_CODESEARCH, workspacePath: "tool/codesearch.txt" },
    { category: "tool", name: "tool.apply_patch", builtIn: TOOL_APPLY_PATCH, workspacePath: "tool/apply_patch.txt" },
    { category: "tool", name: "tool.plan-exit", builtIn: TOOL_PLAN_EXIT, workspacePath: "tool/plan-exit.txt" },
    {
      category: "tool",
      name: "tool.structured-output",
      builtIn: TOOL_STRUCTURED_OUTPUT,
      workspacePath: "tool/structured-output.txt",
    },

    // Command templates
    {
      category: "command",
      name: "command.initialize",
      builtIn: PROMPT_INITIALIZE,
      workspacePath: "command/initialize.txt",
    },
    { category: "command", name: "command.review", builtIn: PROMPT_REVIEW, workspacePath: "command/review.txt" },
  ]

  const map = new Map(entries.map((e) => [e.name, e]))

  export function get(name: string): Entry | undefined {
    return map.get(name)
  }

  export function list(): Entry[] {
    return entries
  }

  export function listByCategory(category: Category): Entry[] {
    return entries.filter((e) => e.category === category)
  }

  export function criticalSystemPrompts(): Entry[] {
    return entries.filter((e) => e.category === "system" && ["plan", "build-switch", "max-steps"].includes(e.name))
  }

  export function getEntryPathForScaffoldWrite(entry: any, cachePath: string): string {
    const ext = path.extname(entry.workspacePath)
    let userCustom = entry.workspacePath.replace(ext, `-no-edit${ext}`)
    return path.join(cachePath, userCustom)
  }

  export function getEntryPathLatest(entry: any, cachePath: string): string {
    const ext = path.extname(entry.workspacePath)
    let userCustom = entry.workspacePath.replace(ext, `-user${ext}`)
    return path.join(cachePath, userCustom)
  }  
}
