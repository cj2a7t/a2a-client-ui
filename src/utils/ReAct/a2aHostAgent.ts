import { SettingA2AServer } from "@/types/a2a";
import { SettingModel } from "@/types/setting";
import { getA2AHostAgentSystemPrompt } from "./a2aSystemPropmt";
import { invokeChatCompletion } from "@/request/ipc/invoke";

// Action interface definition
export interface SendToAgentAction {
    type: 'send_to_agent';
    agent_name: string;
    skill_name: string;
    message: string;
}

export class A2AHostAgent {

    private a2aServers: SettingA2AServer[];
    private model: SettingModel;

    constructor(a2aServers: SettingA2AServer[], model: SettingModel) {
        this.a2aServers = a2aServers;
        this.model = model;
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
    extractFinalAnswer(response: string): string | null {
        const finalAnswerMatch = response.match(/<final_answer>(.*?)<\/final_answer>/s);
        return finalAnswerMatch ? finalAnswerMatch[1].trim() : null;
    }

    /**
     * Extract thought content
     * @param response AI response text
     * @returns thought content, returns null if not found
     */
    extractThought(response: string): string | null {
        const thoughtMatch = response.match(/<thought>(.*?)<\/thought>/s);
        return thoughtMatch ? thoughtMatch[1].trim() : null;
    }

    async repeatReAct(times: number, fn: () => Promise<void>): Promise<void> {
        for (let i = 0; i < times; i++) {
            await fn();
        }
    };

    async sendMessage(userPrompt: string) {
        const maxReActTimes = 8;
        try {
            const systemPrompt = getA2AHostAgentSystemPrompt(this.a2aServers);
            await this.repeatReAct(maxReActTimes, async () => {
                const apiKey = this.model.apiKey;
                const content = await invokeChatCompletion(systemPrompt, userPrompt, apiKey)
            });
        } catch (error) {
            // TODO
        }
    }

}