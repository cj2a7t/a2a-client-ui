import { invokeStreamChat } from "@/request/ipc/invoke";
import { tauriEventListener } from "../TauriEventListener";
import { ChatMessage } from "@/types/chat";
import { getEnabledSettingModels } from "@/request/ipc/invokeSettingModel";


export const asyncChatCompletion = async (
    messages: ChatMessage[],
    onComplete?: (fullContent: string) => void,
    onChunk?: (chunk: string) => void,
): Promise<string> => {

    try {

        const modelList = await getEnabledSettingModels();
        const model = modelList.find(model => model.modelKey === "DeepSeek");
        if (!model) {
            throw new Error("Currently only deepseek models are supported, please configure your model configuration first.");
        }
        const apiKey = model.apiKey;

        if (!onChunk) {
            throw new Error("onChunk is not defined");
        }

        // Create Promise and set callbacks
        const streamingPromise = new Promise<string>((resolve, reject) => {
            try {
                let timeoutId: NodeJS.Timeout | null = null;
                const clearTimeoutAndResolve = (result: string) => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    console.log('Streaming completed in callLLM, resolving promise');
                    resolve(result);
                };

                const clearTimeoutAndReject = (error: Error) => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    console.error('Streaming error in callLLM, rejecting promise');
                    reject(error);
                };

                // Use chat stream listener
                tauriEventListener.startListening('chat_stream_chunk', {
                    onChunk: (chunk: string) => {
                        onChunk(chunk);
                    },
                    onComplete: (fullContent: string) => {
                        console.log('Full content length:', fullContent.length);
                        if (onComplete) {
                            onComplete(fullContent);
                        }
                        clearTimeoutAndResolve(fullContent);
                        console.log('Promise resolved successfully');
                    },
                    onError: (error: string) => {
                        console.error('Streaming error in callLLM, rejecting promise');
                        clearTimeoutAndReject(new Error(error));
                    },
                    onStatus: (status: string, message: string) => {
                        console.log(`Streaming status: ${status} - ${message}`);
                    }
                }).then(() => {
                    console.log('Global event listener started');
                }).catch((err: any) => {
                    console.error('Failed to start global event listener:', err);
                    clearTimeoutAndReject(new Error('Failed to start global event listener'));
                });

                // Set timeout
                timeoutId = setTimeout(() => {
                    console.warn('Streaming timeout in callLLM');
                    clearTimeoutAndReject(new Error('Streaming timeout'));
                }, 5 * 60 * 1000);

                // Start streaming API
                invokeStreamChat(messages, apiKey)
                    .then(result => {
                        console.log('Streaming API started successfully:', result);
                    })
                    .catch(err => {
                        console.log("invokeStreamChat err: ", err);
                        clearTimeoutAndReject(err);
                    });
            } catch (error) {
                console.error('Failed to call streaming:', error);
                throw error;
            }
        });
        return streamingPromise;
    } catch (error) {
        console.error('Failed to call LLM:', error);
        throw error;
    }
}
