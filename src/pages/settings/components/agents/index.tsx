import React, { useState } from 'react';
import { Card, Button, Modal, Form, Input, Typography, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import './style.less';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Agent {
    id: string;
    name: string;
    url: string;
    description: string;
    status: 'active' | 'inactive' | 'error';
    createdAt: string;
}

const Agents: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([
        {
            id: '1',
            name: 'Default Agent',
            url: 'https://api.deepseek.com/v1',
            description: 'Default AI agent for general tasks',
            status: 'active',
            createdAt: '2024-01-15'
        }
    ]);
    
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [form] = Form.useForm();

    const handleAddAgent = () => {
        setEditingAgent(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEditAgent = (agent: Agent) => {
        setEditingAgent(agent);
        form.setFieldsValue(agent);
        setIsModalVisible(true);
    };

    const handleDeleteAgent = (agentId: string) => {
        Modal.confirm({
            title: 'Delete Agent',
            content: 'Are you sure you want to delete this agent?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                setAgents(prev => prev.filter(agent => agent.id !== agentId));
                message.success('Agent deleted successfully');
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            
            if (editingAgent) {
                // Update existing agent
                setAgents(prev => prev.map(agent => 
                    agent.id === editingAgent.id 
                        ? { ...agent, ...values }
                        : agent
                ));
                message.success('Agent updated successfully');
            } else {
                // Add new agent
                const newAgent: Agent = {
                    id: Date.now().toString(),
                    ...values,
                    status: 'active',
                    createdAt: new Date().toISOString().split('T')[0]
                };
                setAgents(prev => [...prev, newAgent]);
                message.success('Agent added successfully');
            }
            
            setIsModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error('Form validation failed:', error);
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setEditingAgent(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'green';
            case 'inactive': return 'orange';
            case 'error': return 'red';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Active';
            case 'inactive': return 'Inactive';
            case 'error': return 'Error';
            default: return 'Unknown';
        }
    };

    return (
        <div className="agents-container">
            <div className="agents-header">
                <div className="header-content">
                    <Title level={4}>A2A Agents</Title>
                    <Text type="secondary">Manage your A2A agents and their configurations</Text>
                </div>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleAddAgent}
                    size="small"
                >
                    Add Agent
                </Button>
            </div>
            
            <div className="agents-grid">
                {agents.map(agent => (
                    <Card 
                        key={agent.id} 
                        className="agent-card"
                        hoverable
                        actions={[
                            <Button 
                                type="text" 
                                icon={<EditOutlined />}
                                onClick={() => handleEditAgent(agent)}
                                size="small"
                            >
                                Edit
                            </Button>,
                            <Button 
                                type="text" 
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteAgent(agent.id)}
                                size="small"
                            >
                                Delete
                            </Button>
                        ]}
                    >
                        <div className="agent-header">
                            <div className="agent-info">
                                <div className="agent-name">{agent.name}</div>
                                <Tag color={getStatusColor(agent.status)}>
                                    {getStatusText(agent.status)}
                                </Tag>
                            </div>
                        </div>
                        
                        <div className="agent-url">
                            <LinkOutlined style={{ marginRight: 4 }} />
                            <Text type="secondary" className="url-text">
                                {agent.url}
                            </Text>
                        </div>
                        
                        <div className="agent-description">
                            <Text type="secondary">{agent.description}</Text>
                        </div>
                        
                        <div className="agent-meta">
                            <Text type="secondary" className="created-date">
                                Created: {agent.createdAt}
                            </Text>
                        </div>
                    </Card>
                ))}
                
                {agents.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-content">
                            <Text type="secondary">No agents configured</Text>
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={handleAddAgent}
                                size="small"
                            >
                                Add your first agent
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                title={editingAgent ? 'Edit Agent' : 'Add New Agent'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                okText={editingAgent ? 'Update' : 'Add'}
                cancelText="Cancel"
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    size="small"
                >
                    <Form.Item
                        name="name"
                        label="Agent Name"
                        rules={[
                            { required: true, message: 'Please enter agent name' }
                        ]}
                    >
                        <Input placeholder="Enter agent name" />
                    </Form.Item>
                    
                    <Form.Item
                        name="url"
                        label="Agent URL"
                        rules={[
                            { required: true, message: 'Please enter agent URL' },
                            { type: 'url', message: 'Please enter a valid URL' }
                        ]}
                    >
                        <Input placeholder="https://your-agent-url.com" />
                    </Form.Item>
                    
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <TextArea 
                            rows={3} 
                            placeholder="Enter agent description (optional)"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Agents; 