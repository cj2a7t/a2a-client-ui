import { invokeSendA2AMessage } from "@/request/ipc/invoke";
import { SendMessageResponse } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

export const sendA2AMessage = async (
    text: string,
    a2aUrl: string,
    headerSkillId: string,
    agentId?: number
): Promise<any> => {
    const messageId = "msg_id:" + uuidv4();
    const taskId = "task_id:" + uuidv4();
    try {
        const response = await invokeSendA2AMessage(a2aUrl, taskId, messageId, headerSkillId, text, agentId);
        if ('error' in response && response.error) {
            throw new Error(`Failed to send task: ${response.error.message}`);
        }
        return response;
    } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
    }


}