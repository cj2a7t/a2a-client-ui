import { getA2AHostAgentSystemPrompt } from "./a2aSystemPropmt";
import { ChatMessage } from "@/types/chat";
import { asyncChatCompletion } from "./llm";
import { getEnabledSettingA2AServers } from "@/request/ipc/invokeSettingA2A";
import delay from "delay";
import { isEmpty } from "lodash";
import { AgentCard, AgentSkill } from "@a2a-js/sdk";
import { invokeSendA2AMessage } from "@/request/ipc/invoke";
import { sendA2AMessage } from "./a2a";
import { toPrettyJsonString } from "../json";

// Action interface definition
export interface SendToAgentAction {
    type: 'send_to_agent';
    agent_name: string;
    skill_name: string;
    message: string;
}

export class A2AHostAgent {

    private readonly MAX_RE_ACT_TIMES = 8;

    private onChunk: (chunk: string) => void;
    private onComplete?: (finalAnswer: string) => void;

    constructor(
        onChunk: (chunk: string) => void,
        onComplete?: (finalAnswer: string) => void,
    ) {
        this.onChunk = onChunk;
        this.onComplete = onComplete;
    }

    buildA2AStatus(a2aResponseTask: any, agentName: string, skillName: string): string {
        const status = a2aResponseTask.result.status;
        let statusResult = isEmpty(status) ? "completed" : status.state
        const stateText = statusResult === "failed" ? "🔴" : "🟢";
        const a2aResponseTaskText = "#### A2A Server Response: \n" +
            "> 🤖  **Discovered Server Name:** " + agentName + "  \n" +
            "> 🛠️  **Discovered Skill Name:** " + skillName + "  \n" +
            "##### " + stateText + " Invocation " + statusResult + " \n" +
            "```json\n" +
            toPrettyJsonString(a2aResponseTask) +
            "\n```\n";
        return a2aResponseTaskText;
    }

    buildA2ATextKindResult(a2aResponseTask: any): any {
        let a2aText;
        try {
            a2aText = a2aResponseTask.result.parts[0].text;
        } catch (error) {
            console.warn('Failed to get a2aText:', error);
            a2aText = "ReAct: please check the result in the A2A Server.";
        }
        return {
            org: a2aText,
            wrapped: "#### A2A Server Result: \n" + a2aText + " \n"
        };
    }

    /**
     * Extract action from AI response
     * @param response Complete AI response text
     * @returns Parsed action object, returns null if not found
     */
    extractAction(response: string): SendToAgentAction | null {
        try {
            // Use regex to match <action> tags
            const actionMatch = response.match(/<action>(.*?)<\/action>/s);
            if (!actionMatch) {
                return null;
            }

            const actionContent = actionMatch[1].trim();

            // Parse send_to_agent function call
            const sendToAgentMatch = actionContent.match(/send_to_agent\s*\(\s*(.*?)\s*\)/s);
            if (!sendToAgentMatch) {
                return null;
            }

            const params = sendToAgentMatch[1];

            // Extract parameter values
            const agentNameMatch = params.match(/agent_name\s*=\s*"([^"]+)"/);
            const skillNameMatch = params.match(/skill_name\s*=\s*"([^"]+)"/);
            const messageMatch = params.match(/message\s*=\s*"([^"]+)"/);

            if (!agentNameMatch || !skillNameMatch || !messageMatch) {
                throw new Error('Missing required parameters in send_to_agent action');
            }

            return {
                type: 'send_to_agent',
                agent_name: agentNameMatch[1],
                skill_name: skillNameMatch[1],
                message: messageMatch[1].replace(/\\n/g, '\n') // Handle line breaks
            };

        } catch (error) {
            console.error('Failed to extract action:', error);
            return null;
        }
    }

    /**
     * Check if response contains final_answer
     * @param response AI response text
     * @returns final_answer content if found, otherwise returns null
     */
    extractFinalAnswer(response: string): string {
        const finalAnswerMatch = response.match(/<final_answer>(.*?)<\/final_answer>/s);
        return finalAnswerMatch ? finalAnswerMatch[1].trim() : "";
    }

    /**
     * Extract thought content
     * @param response AI response text
     * @returns thought content, returns null if not found
     */
    extractThought(response: string): string {
        const thoughtMatch = response.match(/<thought>(.*?)<\/thought>/s);
        return thoughtMatch ? thoughtMatch[1].trim() : "";
    }

    async streamText(
        text: string,
        onChunk: (chunk: string) => void,
    ) {
        let i = 0;
        while (i < text.length) {
            const randomChunkSize = Math.floor(Math.random() * 6) + 5;
            const chunk = text.slice(i, i + randomChunkSize);
            onChunk(chunk);
            if (i + randomChunkSize < text.length) {
                const randomDelay = Math.floor(Math.random() * 101) + 100;
                await delay(randomDelay);
            }
            i += randomChunkSize;
        }
        await delay(200);
        onChunk("\r");
    };

    async repeatReAct(times: number, fn: () => Promise<boolean>): Promise<void> {
        for (let i = 0; i < times; i++) {
            const finished = await fn();
            if (finished) {
                return;
            }
        }
    };

    async sendMessage(userPrompt: string) {
        try {
            const a2aServers = await getEnabledSettingA2AServers();
            const systemPrompt = getA2AHostAgentSystemPrompt(a2aServers);
            const reActMessages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ];

            await this.repeatReAct(this.MAX_RE_ACT_TIMES, async () => {
                let content = '';
                await asyncChatCompletion(
                    reActMessages,
                    (fullContext) => {
                        content = fullContext;
                    }
                );

                const thought = this.extractThought(content);
                if (!isEmpty(thought)) {
                    this.streamText(thought, this.onChunk)
                }

                const finalAnswer = this.extractFinalAnswer(content);
                if (!isEmpty(finalAnswer)) {
                    this.streamText(finalAnswer, this.onChunk)
                    this.onComplete?.(finalAnswer);
                    return true;
                }

                const action: SendToAgentAction | null = this.extractAction(content);
                if (action == null) {
                    throw new Error("ReAct failed, no action found");
                }

                const agentName = action.agent_name;
                const skillName = action.skill_name;
                const message = action.message;

                const settingA2AServer = a2aServers.find(server => server.name === agentName);
                if (settingA2AServer == null) {
                    throw new Error("ReAct failed, no a2a server found");
                }
                const agentCard: AgentCard = JSON.parse(settingA2AServer.agentCardJson || '{}');
                const skill: AgentSkill | undefined = agentCard.skills.find(skill => skill.name === skillName);
                if (skill == undefined) {
                    throw new Error("ReAct failed, no skill found");
                }
                const a2aResponseTask = await sendA2AMessage(message, agentCard.url, skill.id, settingA2AServer.id);
                const a2aResponseTaskText = this.buildA2AStatus(a2aResponseTask, agentName, skillName);
                await this.streamText(a2aResponseTaskText, this.onChunk);

                const a2aText = this.buildA2ATextKindResult(a2aResponseTask);
                await this.streamText(a2aText.wrapped, this.onChunk);

                reActMessages.push({
                    role: "user",
                    content: a2aText.org
                })
                return false;
            });
        } catch (error) {
            // TODO
        }
    }


}