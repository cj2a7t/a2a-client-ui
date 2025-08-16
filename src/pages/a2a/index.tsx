import React, { useEffect, useState } from 'react';
import KeepAlive from "react-activation";
import { useTabKey } from "@/utils/tabkey";
import { useChatLogic } from './hooks';
import { MessageList, ChatInput, StatusIndicator } from './components';
import { useFlatInject } from '@/utils/hooks';
import "./style.less";

const A2APage: React.FC = () => {
    const tabKey = useTabKey();
    const [store] = useFlatInject("a2a");
    const [streamingState, setStreamingState] = useState({
        isStreaming: false,
        streamCompleted: false,
        debugInfo: ''
    });
    
    const {
        chatData,
        handleSendMessage,
        handleKeyPress,
        handleCopyMessage,
        handleClearMessages,
        setInputValue,
    } = useChatLogic();

    // Clear loading state when tab changes
    useEffect(() => {
        if (tabKey && chatData.isTabLoading) {
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => {
                store.setTabLoading(tabKey, false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [tabKey, chatData.isTabLoading, store]);

    // Update streaming state based on loading status
    useEffect(() => {
        if (chatData.isLoading) {
            setStreamingState(prev => ({
                ...prev,
                isStreaming: true,
                streamCompleted: false,
                debugInfo: 'Starting to process request...'
            }));
        } else {
            setStreamingState(prev => ({
                ...prev,
                isStreaming: false,
                streamCompleted: true,
                debugInfo: 'Request processing completed'
            }));
        }
    }, [chatData.isLoading]);

    return (
        // <KeepAlive
        //     name={"a2aChatKeepalive"}
        //     cacheKey={tabKey || "default"}
        // >
        <div className="a2a-container">
            {chatData.isTabLoading && (
                <div className="tab-loading-overlay">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <div className="loading-text">Loading...</div>
                    </div>
                </div>
            )}
            
            <StatusIndicator
                isLoading={chatData.isLoading}
                isStreaming={streamingState.isStreaming}
                streamCompleted={streamingState.streamCompleted}
                debugInfo={streamingState.debugInfo}
            />
            
            <MessageList
                messages={chatData.messages}
                onCopyMessage={handleCopyMessage}
            />

            <ChatInput
                value={chatData.inputValue}
                onChange={setInputValue}
                onSend={handleSendMessage}
                onKeyPress={handleKeyPress}
                disabled={chatData.isLoading}
                loading={chatData.isLoading}
                isEnabled={chatData.isEnabled}
                agentConfig={chatData.agentConfig}
                onClearMessages={handleClearMessages}
                hasMessages={chatData.messages.length > 0}
            />
        </div>
        // </KeepAlive>
    );
};

export default A2APage; 