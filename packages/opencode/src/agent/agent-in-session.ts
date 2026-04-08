import { PromptLoader } from "@/prompt/loader"
import { Agent } from "../agent/agent"
import type { MessageV2 } from "@/session/message-v2"
import type { Session } from "@/session"
import { PartID } from "@/session/schema"


export namespace AgentInSession {
    export function onActiveAgent(
    input: {
            messages: MessageV2.WithParts[]
            agent: Agent.Info
            session: Session.Info
        }        
    ){
        const userMessage = input.messages.findLast((msg) => msg.info.role === "user")
        if (!userMessage) return input.messages

        const reminder = PromptLoader.get("reminder." + input.agent.name)
        if(reminder) {
            userMessage.parts.push({
              id: PartID.ascending(),
              messageID: userMessage.info.id,
              sessionID: userMessage.info.sessionID,
              type: "text",
              text: reminder,
              synthetic: true,
            })
        }
    }

    export function onAgentChange(
    input: {
            messages: MessageV2.WithParts[]
            agent: Agent.Info
            session: Session.Info
        }         
    ){
        const userMessage = input.messages.findLast((msg) => msg.info.role === "user")
        if (!userMessage) return input.messages

        const lastAgentMessage = input.messages.findLast((msg) => msg.info.role === "assistant" && msg.info.agent)
        const lastAgent = lastAgentMessage?.info.agent
        if(lastAgent === input.agent.name) {
            // agent didn't actually change, no need to add reminder again
            return input.messages
        }
        
        const buildSwitchPrompt = PromptLoader.get(`system.${lastAgent}-${input.agent.name}-switch`)
        if(buildSwitchPrompt) {
            userMessage.parts.push({
              id: PartID.ascending(),
              messageID: userMessage.info.id,
              sessionID: userMessage.info.sessionID,
              type: "text",
              text: buildSwitchPrompt,
              synthetic: true,
            })
        }
        return input.messages
    }
}