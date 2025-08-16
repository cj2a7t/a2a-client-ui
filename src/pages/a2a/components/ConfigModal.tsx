import React from 'react';
import { Modal, Form, Input, Switch, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ConfigModalProps {
    visible: boolean;
    onOk: () => void;
    onCancel: () => void;
    form: any;
    initialValues: {
        agentUrl: string;
        isEnabled: boolean;
        apiKey: string;
    };
}

const ConfigModal: React.FC<ConfigModalProps> = ({
    visible,
    onOk,
    onCancel,
    form,
    initialValues
}) => {
    return (
        <Modal
            title="Configure A2A Client"
            open={visible}
            onOk={onOk}
            onCancel={onCancel}
            okText="Save"
            cancelText="Cancel"
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
            >
                <div style={{
                    padding: '18px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    marginBottom: '16px'
                }}>
                    <Form.Item
                        name="apiKey"
                        label="AI API-KEY"
                        rules={[
                            {
                                required: true,
                                message: 'Please enter your AI API Key',
                                validateTrigger: ['onSubmit'],
                            },
                        ]}
                        style={{ marginBottom: '16px' }}
                    >
                        <Input.Password
                            placeholder="sk-..."
                            autoComplete="off"
                            addonAfter={
                                <Tooltip title="Your AI API Key for LLM calls (currently supports DeepSeek)">
                                    <InfoCircleOutlined />
                                </Tooltip>
                            }
                        />
                    </Form.Item>
                    <div className="config-info">
                        <Text type="secondary">
                            <InfoCircleOutlined /> This API key is used for LLM calls. Currently supports DeepSeek. The key will be stored locally and used for A2A workflow execution.
                        </Text>
                    </div>
                </div>

                <Form.Item
                    name="agentUrl"
                    label="Agent Server URL"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter the Agent Server URL',
                            validateTrigger: ['onSubmit'],
                        },
                        {
                            type: 'url',
                            message: 'Please enter a valid URL',
                            validateTrigger: ['onSubmit'],
                        },
                    ]}
                >
                    <Input
                        placeholder="https://your-agent-card-url.com"
                        autoComplete="off"
                        addonAfter={
                            <Tooltip title="The full URL to your agent server. The system will automatically append /.well-known/agent.json for validation.">
                                <InfoCircleOutlined />
                            </Tooltip>
                        }
                    />
                </Form.Item>

                <Form.Item
                    name="isEnabled"
                    label="Enable A2A Server"
                    valuePropName="checked"
                >
                    <Switch
                        checkedChildren="Enabled"
                        unCheckedChildren="Disabled"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ConfigModal; 