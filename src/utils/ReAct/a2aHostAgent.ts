import { getA2AHostAgentSystemPrompt } from "./a2aSystemPropmt";
import { asyncChatCompletion } from "./llm";
import delay from "delay";
import { isEmpty } from "lodash";
import { AgentCard, AgentSkill } from "@a2a-js/sdk";
import { sendA2AMessage } from "./a2a";
import { toPrettyJsonString } from "../json";
import { toExtractJsonString, toJsonStringWithPrefix } from "../markdown";
import { SettingA2AServer } from "@/types/a2a";

// Action interface definition
export interface SendToAgentAction {
    type: 'send_to_agent';
    agent_name: string;
    skill_name: string;
    message: string;
}

export type A2ATextKindWrapper = {
    text: string;
    text4ReAct: string;
    text4Chunk: string;
}

export const streamText = async (
    text: string,
    onChunk: (chunk: string) => void,
) => {
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
export class A2AHostAgent {

    private readonly MAX_RE_ACT_TIMES = 8;

    private onChunk: (chunk: string) => void;
    private onComplete?: (finalAnswer: string) => void;
    private settingA2AServers: SettingA2AServer[];

    constructor(
        settingA2AServers: SettingA2AServer[],
        onChunk: (chunk: string) => void,
        onComplete?: (finalAnswer: string) => void,
    ) {
        this.onChunk = onChunk;
        this.onComplete = onComplete;
        this.settingA2AServers = settingA2AServers;
    }

    buildA2ATextKindResult(a2aResponseTask: any, reActTimes: number, agentName: string, skillName: string): A2ATextKindWrapper {
        let a2aText;
        try {
            a2aText = a2aResponseTask.result.parts[0].text;
        } catch (error) {
            console.warn('Failed to get a2aText:', error);
            a2aText = "ReAct: please check the result in the A2A Server.";
        }
        const status = a2aResponseTask.result.status;
        let statusResult = isEmpty(status) ? "completed" : status.state
        const stateText = statusResult === "failed" ? "🔴" : "🟢";
        return {
            text: a2aText,
            text4ReAct: `<observation>${reActTimes}. ${a2aText}</observation>`,
            text4Chunk: "#### Observation: \n" +
                "> 🤖  **Discovered Server Name:** " + agentName + "  \n" +
                "> 🛠️  **Discovered Skill Name:** " + skillName + "  \n" +
                "##### " + stateText + " **Invocation** " + statusResult + " \n" +
                a2aText + " \n" +
                " \n"
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
            console.log('===>>>actionMatch: ', actionMatch);

            const actionContent = actionMatch[1].trim();

            // Parse send_to_agent function call
            const sendToAgentMatch = actionContent.match(/send_to_agent\s*\(\s*(.*?)\s*\)/s);
            if (!sendToAgentMatch) {
                return null;
            }
            let params = sendToAgentMatch[1];

            // Extract parameter values
            let agentNameMatch = params.match(/agent_name\s*=\s*"([^"]+)"/);
            let skillNameMatch = params.match(/skill_name\s*=\s*"([^"]+)"/);
            let messageMatch = params.match(/message\s*=\s*"([^"]+)"/);

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


    async repeatReAct(times: number, fn: () => Promise<boolean>): Promise<void> {
        for (let i = 0; i < times; i++) {
            const finished = await fn();
            if (finished) {
                return;
            }
        }
    };

    async executeReAct(userPrompt: string) {
        try {

            // build ReAct messages
            const systemPrompt = getA2AHostAgentSystemPrompt(this.settingA2AServers);
            const reActMessages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: "<question>" + userPrompt + "</question>" }
            ];

            // Simply avoid ReAct's infinite loop issue
            let reActTimes = 1;
            await this.repeatReAct(this.MAX_RE_ACT_TIMES, async () => {

                // Call LLM to get content
                let content = '';
                await asyncChatCompletion(
                    reActMessages,
                    () => { },
                    (fullContent) => {
                        content = fullContent;
                    }
                );
                console.log('===>>>content: ', content);

                // Extract [thought]
                const thought = this.extractThought(content);
                if (!isEmpty(thought)) {
                    const thoughtText = "> **Thought:** " + thought + " \n";
                    await streamText(thoughtText, this.onChunk)
                }

                await delay(200);
                this.onChunk("\r");

                // Extract [final answer]
                const finalAnswer = this.extractFinalAnswer(content);
                if (!isEmpty(finalAnswer)) {
                    const finalAnswerText = "#### Final Answer: \n" + finalAnswer + " \n";
                    await streamText(finalAnswerText, this.onChunk)
                    this.onComplete?.(finalAnswer);
                    return true;
                }

                await delay(200);
                this.onChunk("\r");

                // Extract [action]
                const action: SendToAgentAction | null = this.extractAction(content);
                if (action == null) {
                    throw new Error("ReAct failed, no action found");
                }
                const agentName = action.agent_name;
                const skillName = action.skill_name;
                const message = action.message;
                await streamText(toJsonStringWithPrefix("#### Action: \n", action) + " \n", this.onChunk)

                await delay(200);
                this.onChunk("\r");

                // Send message to A2A server
                const settingA2AServer = this.settingA2AServers.find(server => server.name === agentName);
                if (settingA2AServer == null) {
                    throw new Error("ReAct failed, no a2a server found");
                }
                const agentCard: AgentCard = JSON.parse(settingA2AServer.agentCardJson || '{}');
                const skill: AgentSkill | undefined = agentCard.skills.find(skill => skill.name === skillName);
                if (skill == undefined) {
                    throw new Error("ReAct failed, no skill found");
                }
                const a2aResponseTask = await sendA2AMessage(message, agentCard.url, skill.id, settingA2AServer.id);

                // Build [observation]
                const a2aText = this.buildA2ATextKindResult(a2aResponseTask, reActTimes, agentName, skillName);
                await streamText(a2aText.text4Chunk, this.onChunk);
                reActMessages.push({
                    role: "user",
                    content: a2aText.text4ReAct
                })

                reActTimes++;
                return false;
            });
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorPrefix = "##### Error: \n";
            this.onChunk(errorPrefix);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorText = toExtractJsonString(errorMessage);
            await streamText(errorText, this.onChunk);
            this.onComplete?.("finished");
        }
    }
}
