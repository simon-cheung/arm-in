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

export const PlaygroundTool = Tool.define(
  "playground",
  Effect.gen(function* () {
    const bus = yield* Bus.Service

    return {
      description:
        "Open a URL in the playground tab for preview. Supports http://, https://, and blob:// URLs. Optionally inject JavaScript into the page after load.",
      parameters: z.object({
        url: z.string().describe("The URL to open in the playground (http://, https://, or blob://)"),
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
