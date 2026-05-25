import z from "zod"
import { Effect } from "effect"
import { Tool } from "./tool"
import { Bus } from "../bus"
import { BusEvent } from "../bus/bus-event"

export const PlaygroundOpened = BusEvent.define(
  "playground.opened",
  z.object({
    url: z.string(),
    html: z.string().optional(),
  }),
)

export const PlaygroundMessage = BusEvent.define(
  "playground.message",
  z.object({
    action: z.literal("download"),
    url: z.string(),
    suggestedName: z.string().optional(),
  }),
)

export const PlaygroundTool = Tool.define(
  "playground",
  Effect.gen(function* () {
    const bus = yield* Bus.Service

    return {
      description:
        'Open a URL in the playground tab for preview. Supports:\n- http://, https://, blob:// for web URLs\n- workspace://{path} for files in workspace (e.g., "workspace://html/index.html")',
      parameters: z.object({
        url: z
          .string()
          .describe(
            'The URL to open in the playground. Supports:\n- http://, https://, blob:// for web URLs\n- workspace://{path} for files in workspace (e.g., "workspace://html/index.html")',
          ),
        html: z.string().optional().describe("JavaScript to execute after the page loads"),
      }),
      execute: (params: { url: string; html?: string }, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.metadata({ title: params.url })
          yield* bus.publish(PlaygroundOpened, { url: params.url, html: params.html })
          return { title: params.url, output: `Opened ${params.url}`, metadata: {} }
        }).pipe(Effect.orDie),
    }
  }),
)
