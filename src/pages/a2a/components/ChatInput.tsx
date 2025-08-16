import React from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import AgentStatusIndicator from './AgentStatusIndicator';
import { ChangelogModal } from '@/components';

const { TextArea } = Input;

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
    disabled: boolean;
    loading: boolean;
    isEnabled: boolean;
    agentConfig: any;
    onShowConfig: () => void;
    onClearMessages: () => void;
    hasMessages: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    onKeyPress,
    disabled,
    loading,
    isEnabled,
    agentConfig,
    onShowConfig,
    onClearMessages,
    hasMessages
}) => {
    return (
        <div className="input-container">
            <div className="input-wrapper">
                <TextArea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyPress={onKeyPress}
                    placeholder="Type your message..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    disabled={disabled}
                    className="chat-input"
                    autoFocus
                    style={{ resize: 'none' }}
                />
            </div>
            <div className="bottom-actions">
                <AgentStatusIndicator 
                    isEnabled={isEnabled}
                    agentConfig={agentConfig}
                />
                <div className="send-action">
                    <ChangelogModal 
                        showTrigger={true}
                        onClose={() => {}}
                    />
                    <Button
                        type="text"
                        icon={<SettingOutlined />}
                        onClick={onShowConfig}
                        className="settings-btn"
                        title="Configure A2A Client"
                    />
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={onClearMessages}
                        disabled={!hasMessages}
                        className="clear-btn"
                        title="Clear all messages"
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={onSend}
                        disabled={!value.trim() || disabled}
                        loading={loading}
                        className="send-btn"
                        title="Send message"
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatInput; 