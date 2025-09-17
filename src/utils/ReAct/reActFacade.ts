import delay from "delay";
import { A2AHostAgent, streamText } from "./a2aHostAgent";
import { asyncChatCompletion } from "./llm";
import { getEnabledSettingA2AServers } from "@/request/ipc/invokeSettingA2A";
import { getEnabledSettingModels } from "@/request/ipc/invokeSettingModel";
import { toJsonStringWithPrefix } from "../markdown";
import { isEmpty } from "lodash";
import { SettingA2AServer } from "@/types/a2a";


export const executeA2AReAct = async (
    userPrompt: string,
    onChunk: (chunk: string) => void,
    onComplete?: (chunk: string) => void,
) => {

    // TODO support other LLM models
    const modelList = await getEnabledSettingModels();
    const model = modelList.find(model => model.modelKey === "DeepSeek");
    if (!model) {
        return reActError(
            userPrompt,
            "Currently only deepseek models are supported, please configure your model configuration first.",
            onChunk,
            onComplete
        );
    }

    const settingA2AServers = await getEnabledSettingA2AServers();
    if (settingA2AServers.length === 0) {
        return executeSimpleChat(userPrompt, onChunk, onComplete);
    }

    const a2aProtocolMethod = userPrompt.match(/@\/message\/send|\@\/message\/stream/);
    if (isEmpty(a2aProtocolMethod)) {
        return reActError(
            userPrompt,
            "Use the @A2A command to get started. If you'd prefer not to use A2A, you can disable A2A Servers anytime.",
            onChunk,
            onComplete
        );
    }

    return executeReAct4A2AHostAgent(userPrompt, settingA2AServers, onChunk, onComplete);
}

export const executeReAct4A2AHostAgent = async (
    userPrompt: string,
    settingA2AServers: SettingA2AServer[],
    onChunk: (chunk: string) => void,
    onComplete?: (chunk: string) => void,
) => {
    return new A2AHostAgent(settingA2AServers, onChunk, onComplete).executeReAct(userPrompt);
}

export const executeSimpleChat = async (
    userPrompt: string,
    onChunk: (chunk: string) => void,
    onComplete?: (chunk: string) => void,
) => {
    await asyncChatCompletion(
        [
            { role: "user", content: userPrompt }
        ],
        onComplete,
        onChunk
    )
    await delay(300);
    onChunk("\r");
    onComplete?.("finished");
}

export const reActError = async (
    userPrompt: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete?: (chunk: string) => void,
) => {
    const response = {
        userprompt: userPrompt,
        message: message
    };
    const resultText = toJsonStringWithPrefix("#### Error: \n", response);
    streamText(resultText, onChunk);
    onComplete?.("finished");
}