import React, { useRef, useEffect } from 'react';
import { Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { Message } from '@/types/a2a';
import MessageItem from './MessageItem';

const { Text } = Typography;

interface MessageListProps {
    messages: Message[];
    onCopyMessage: (content: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onCopyMessage }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="empty-state">
                <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <Text type="secondary" style={{ fontSize: 16, marginTop: 16 }}>
                    Start chatting with A2A Client!
                </Text>
            </div>
        );
    }

    return (
        <div className="messages-container">
            {messages.map((message: Message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    onCopy={onCopyMessage}
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList; 