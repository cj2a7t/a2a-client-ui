import React from 'react';
import { Spin, Tag } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface StatusIndicatorProps {
    isLoading: boolean;
    isStreaming?: boolean;
    streamCompleted?: boolean;
    debugInfo?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    isLoading,
    isStreaming = false,
    streamCompleted = false,
    debugInfo
}) => {
    // Don't show status bar when AI is thinking (streaming)
    if (!isLoading || isStreaming) {
        return null;
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            marginBottom: '12px'
        }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
            <span style={{ color: '#666' }}>
                🤔 Processing request...
            </span>
            {debugInfo && (
                <Tag color="blue">
                    Debug: {debugInfo}
                </Tag>
            )}
            {streamCompleted && (
                <Tag color="orange">
                    Streaming completed
                </Tag>
            )}
        </div>
    );
};

export default StatusIndicator; 