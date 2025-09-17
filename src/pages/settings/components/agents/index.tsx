import { SettingA2AServer } from '@/types/a2a';
import { useFlatInject, useHttp } from '@/utils/hooks';
import { initMonacoTheme } from '@/utils/monaco';
import { CloudServerOutlined, DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';
import { Button, Form, Input, Layout, Modal, Popconfirm, Spin, Table, Typography, message } from 'antd';
import React, { useState } from 'react';
import './style.less';
import { toPrettyJsonString } from '@/utils/json';

const { Text, Title } = Typography;
const { Header, Content } = Layout;

const Agents: React.FC = () => {
    const [store] = useFlatInject("setting");
    const { loading: loadingSettingAgents } = useHttp(() => store.onLoadSettingAgents());
    const {
        settingAgents,
        onSaveAgent,
        onDeleteAgent,
        isAgentModalVisible, editingAgent,
        onShowAgentModal, onHideAgentModal, onSetEditingAgent
    } = store;

    const [form] = Form.useForm();
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    const handleAddAgent = () => {
        onSetEditingAgent(null);
        form.resetFields();
        onShowAgentModal();
    };

    const handleEditAgent = (agent: SettingA2AServer) => {
        onSetEditingAgent(agent);
        console.log(agent)
        form.setFieldsValue({
            agent_card_url: agent.agentCardUrl,
            custom_header_json: agent.customHeaderJson ? toPrettyJsonString(JSON.parse(agent.customHeaderJson)) : toPrettyJsonString({
                "X-A2A-Client-UI-Version": "v0.1.5"
            }),
            protocol_data_object_settings: agent.protocolDataObjectSettings ? toPrettyJsonString(JSON.parse(agent.protocolDataObjectSettings)) : toPrettyJsonString({
                "kind": "text",
                "text": "{{USER_PROMPT}}"
            })
        });
        onShowAgentModal();
    };

    React.useEffect(() => {
        const initMonaco = async () => {
            try {
                await initMonacoTheme();
            } catch (error) {
                console.error('Failed to initialize Monaco theme:', error);
            }
        };
        initMonaco();
    }, []);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => (
                <span style={{ color: '#1f2937', fontSize: '12px', fontWeight: '500' }}>
                    {text}
                </span>
            ),
        },
        {
            title: 'URL',
            dataIndex: 'agentCardUrl',
            key: 'agentCardUrl',
            render: (text: string) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <LinkOutlined style={{ marginRight: 4, color: '#6b7280' }} />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                        {text}
                    </Text>
                </div>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text: string) => (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                    {text}
                </Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: SettingA2AServer) => (
                <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditAgent(record)}
                        size="small"
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete A2A Server"
                        description="Are you sure you want to delete this A2A server?"
                        onConfirm={() => handleDeleteAgent(record.id!)}
                        okText="Delete"
                        cancelText="Cancel"
                        placement="topRight"
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const expandedRowRender = (record: SettingA2AServer) => {
        console.log('Rendering expanded row for agent:', record.id, record.name);

        const jsonValue = (() => {
            try {
                return record.agentCardJson ? JSON.stringify(JSON.parse(record.agentCardJson), null, 2) : '{}';
            } catch (error) {
                console.error('JSON parsing error:', error);
                return JSON.stringify({ error: 'Invalid JSON format' }, null, 2);
            }
        })();

        return (
            <div key={`expanded-${record.id}`} style={{ padding: '16px', background: '#fafafa', borderRadius: '6px', margin: '8px 0' }}>
                <div style={{ height: '300px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                    <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={jsonValue}
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 12,
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            theme: 'vs',
                            scrollbar: {
                                vertical: 'visible',
                                horizontal: 'visible',
                                verticalScrollbarSize: 6,
                                horizontalScrollbarSize: 6,
                                verticalSliderSize: 6,
                                horizontalSliderSize: 6
                            }
                        }}
                        onMount={(editor) => {
                            console.log('Monaco editor mounted for agent:', record.id);
                            editor.focus();
                        }}
                    />
                </div>
            </div>
        );
    };

    const handleDeleteAgent = async (agentId: number) => {
        try {
            await onDeleteAgent(agentId);
            message.success('A2A server deleted successfully');
        } catch (error) {
            console.error('Delete agent error:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error';
            message.error(`Failed to delete A2A server: ${errorMessage}`);
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();

            if (editingAgent) {
                // Update existing agent
                try {
                    await onSaveAgent({
                        ...editingAgent,
                        agentCardUrl: values.agent_card_url,
                        customHeaderJson: values.custom_header_json || toPrettyJsonString({
                            "X-A2A-Client-UI-Version": "v0.1.5"
                        }),
                        protocolDataObjectSettings: values.protocol_data_object_settings || toPrettyJsonString({
                            "kind": "text",
                            "text": "{{USER_PROMPT}}"
                        })
                    });
                    message.success('A2A server updated successfully');
                } catch (error) {
                    console.error('Update agent error:', error);
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Unknown error';
                    message.error(`Failed to update A2A server: ${errorMessage}`);
                }
            } else {
                // Add new agent
                try {
                    await onSaveAgent({
                        name: `A2A Server ${Date.now()}`, // Generate a default name
                        agentCardUrl: values.agent_card_url,
                        enabled: false,
                        agentCardJson: '',
                        customHeaderJson: values.custom_header_json || toPrettyJsonString({
                            "X-A2A-Client-UI-Version": "v0.1.5"
                        }),
                        protocolDataObjectSettings: values.protocol_data_object_settings || toPrettyJsonString({
                            "kind": "text",
                            "text": "{{USER_PROMPT}}"
                        })
                    });
                    message.success('A2A server added successfully');
                } catch (error) {
                    console.error('Add agent error:', error);
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Unknown error';
                    const errorText = errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage;
                    message.error(`Failed to add A2A server: ${errorText}`);
                }
            }

            onHideAgentModal();
            form.resetFields();
        } catch (error) {
            console.error('Form validation failed:', error);
        }
    };

    const handleModalCancel = () => {
        onHideAgentModal();
        form.resetFields();
    };

    return (
        <Layout className="agents-container">
            <Header className="agents-header">
                <div className="header-content">
                    <div className="header-title">
                        <Title level={4}>A2A Servers</Title>
                        <Text type="secondary">Manage your A2A servers and their configurations</Text>
                    </div>
                    {settingAgents.length > 0 && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddAgent}
                            size="small"
                            className="add-button"
                        >
                            Add A2A Server
                        </Button>
                    )}
                </div>
            </Header>

            <Content className="agents-content">
                {loadingSettingAgents ? (
                    <div className="loading-overlay">
                        <div className="loading-content">
                            <Spin size="large" />
                            <Text type="secondary" style={{ marginTop: 16, fontSize: 14 }}>Loading A2A servers...</Text>
                        </div>
                    </div>
                ) : (settingAgents && settingAgents.length > 0) ? (
                    <Table
                        showHeader={false}
                        className="agents-table"
                        columns={columns}
                        dataSource={settingAgents}
                        expandable={{
                            expandedRowRender: expandedRowRender,
                            expandRowByClick: false,
                            expandedRowKeys: expandedRowKeys,
                            onExpand: (expanded, record) => {
                                if (expanded) {
                                    setExpandedRowKeys([record.id || record.name]);
                                } else {
                                    setExpandedRowKeys([]);
                                }
                            }
                        }}
                        rowKey={(record) => record.id || record.name}
                        pagination={false}
                        size="small"
                    />
                ) : (
                    <div className="empty-state">
                        <div className="empty-content">
                            <CloudServerOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>No A2A servers configured</Text>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 12 }}>Get started by adding your first A2A server</Text>
                            <Button
                                type="primary"
                                onClick={handleAddAgent}
                                size="small"
                            >
                                Add your first A2A server
                            </Button>
                        </div>
                    </div>
                )}
            </Content>

            <Modal
                title={editingAgent ? 'Edit A2A Server' : 'Add New A2A Server'}
                open={isAgentModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                okText={editingAgent ? 'Update' : 'Add'}
                cancelText="Cancel"
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    size="small"
                >
                    <Form.Item
                        name="agent_card_url"
                        label="A2A Server URL"
                        rules={[
                            { required: true, message: 'Please enter A2A server URL' },
                            { type: 'url', message: 'Please enter a valid URL' }
                        ]}
                        style={{ marginBottom: 8 }}
                    >
                        <Input placeholder="https://your-a2a-server-url.com" />
                    </Form.Item>

                    <Form.Item
                        name="custom_header_json"
                        label={
                            <span>
                                Custom Request Headers
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal', marginLeft: '8px' }}>
                                    (Optional)
                                </span>
                            </span>
                        }
                        help={
                            <div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    <strong>Common use cases:</strong>
                                    <br />• Authorization: Bearer tokens, API keys
                                </div>
                            </div>
                        }
                    >
                        <div style={{
                            height: '150px',
                            border: "1px solid #d9d9d9",
                            borderRadius: "6px",
                            overflow: "hidden"
                        }}>
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                value={form.getFieldValue('custom_header_json') || toPrettyJsonString({
                                    "X-A2A-Client-UI-Version": "v0.1.5"
                                })}
                                options={{
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 11,
                                    lineNumbers: 'off',
                                    wordWrap: 'on',
                                    theme: 'vs',
                                    scrollbar: {
                                        vertical: 'visible',
                                        horizontal: 'visible',
                                        verticalScrollbarSize: 6,
                                        horizontalScrollbarSize: 6,
                                        verticalSliderSize: 6,
                                        horizontalSliderSize: 6
                                    },
                                    suggestOnTriggerCharacters: true,
                                    quickSuggestions: true,
                                    parameterHints: {
                                        enabled: true
                                    },
                                    folding: true,
                                    foldingStrategy: 'indentation',
                                    showFoldingControls: 'always',
                                    foldingHighlight: true,
                                    lineHeight: 18,
                                    padding: { top: 8, bottom: 8 }
                                }}
                                onMount={(editor) => {
                                    console.log('Custom headers Monaco editor mounted');
                                    editor.focus();
                                }}
                                onChange={(value) => {
                                    form.setFieldsValue({ custom_header_json: value });
                                }}
                            />
                        </div>
                    </Form.Item>

                    <Form.Item
                        name="protocol_data_object_settings"
                        label={
                            <span style={{ marginTop: 8 }}>
                                Protocol Data Object Settings
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal', marginLeft: '8px' }}>
                                    (Optional)
                                </span>
                            </span>
                        }
                    >
                        <div style={{
                            height: '150px',
                            border: "1px solid #d9d9d9",
                            borderRadius: "6px",
                            overflow: "hidden"
                        }}>
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                value={form.getFieldValue('protocol_data_object_settings') || toPrettyJsonString({
                                    "kind": "text",
                                    "text": "{{USER_PROMPT}}"
                                })}
                                options={{
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 11,
                                    lineNumbers: 'off',
                                    wordWrap: 'on',
                                    theme: 'vs',
                                    scrollbar: {
                                        vertical: 'visible',
                                        horizontal: 'visible',
                                        verticalScrollbarSize: 6,
                                        horizontalScrollbarSize: 6,
                                        verticalSliderSize: 6,
                                        horizontalSliderSize: 6
                                    },
                                    suggestOnTriggerCharacters: true,
                                    quickSuggestions: true,
                                    parameterHints: {
                                        enabled: true
                                    },
                                    folding: true,
                                    foldingStrategy: 'indentation',
                                    showFoldingControls: 'always',
                                    foldingHighlight: true,
                                    lineHeight: 18,
                                    padding: { top: 8, bottom: 8 }
                                }}
                                onMount={(editor) => {
                                    console.log('Protocol Data Object Settings Monaco editor mounted');
                                    editor.focus();
                                }}
                                onChange={(value) => {
                                    form.setFieldsValue({ protocol_data_object_settings: value });
                                }}
                            />
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default Agents; 