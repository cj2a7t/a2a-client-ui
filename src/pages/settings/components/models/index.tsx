import React, { useState } from 'react';
import { Card, Switch, Typography, Tag, Space, Input, Button, Divider } from 'antd';
import deepseekIcon from '@/assets/deepseek.png';
import openaiIcon from '@/assets/openai.png';
import { 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    ReloadOutlined,
    SettingOutlined,
    CheckOutlined,
    LinkOutlined
} from '@ant-design/icons';
import './style.less';

const { Text, Title } = Typography;
const { Password } = Input;

interface Provider {
    id: string;
    name: string;
    enabled: boolean;
    apiUrl: string;
    apiKey: string;
    comingSoon?: boolean;
}

const Models: React.FC = () => {
    const [providers, setProviders] = useState<Provider[]>([
        {
            id: 'deepseek',
            name: 'DeepSeek',
            enabled: true,
            apiUrl: 'https://api.deepseek.com/v1',
            apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        },
        {
            id: 'openai',
            name: 'OpenAI',
            enabled: false,
            apiUrl: 'https://api.openai.com/v1',
            apiKey: '',
            comingSoon: true
        }
    ]);

    const [selectedProvider, setSelectedProvider] = useState<string>('deepseek');

    const handleToggleProvider = (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        if (provider?.comingSoon) {
            return; // Coming soon providers cannot be toggled
        }
        
        setProviders(prev => prev.map(provider => ({
            ...provider,
            enabled: provider.id === providerId ? !provider.enabled : false
        })));
    };

    const selectedProviderData = providers.find(p => p.id === selectedProvider);

    return (
        <div className="models-container">
            <div className="models-layout">
                {/* Left Provider List */}
                <div className="providers-sidebar">
                    <div className="providers-list">
                        {providers.map(provider => (
                            <div 
                                key={provider.id}
                                className={`provider-item ${selectedProvider === provider.id ? 'selected' : ''} ${provider.comingSoon ? 'coming-soon' : ''}`}
                                onClick={() => !provider.comingSoon && setSelectedProvider(provider.id)}
                            >
                                <div className="provider-info">
                                    <div className="provider-icon">
                                        <img 
                                            src={provider.name === 'DeepSeek' ? deepseekIcon : openaiIcon} 
                                            alt={provider.name}
                                            className="provider-logo"
                                        />
                                    </div>
                                    <div className="provider-name">
                                        {provider.name}
                                    </div>
                                </div>
                                {provider.comingSoon ? (
                                    <div className="coming-soon-switch">Coming Soon</div>
                                ) : (
                                    <Switch
                                        checked={provider.enabled}
                                        onChange={() => handleToggleProvider(provider.id)}
                                        size="small"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Configuration */}
                <div className="provider-details">
                    {selectedProviderData && (
                        <>
                            {selectedProviderData.comingSoon ? (
                                <div className="coming-soon-content">
                                    <div className="coming-soon-message">
                                        <div className="message-icon">🚀</div>
                                        <div className="message-text">
                                            <h3>Coming Soon: {selectedProviderData.name}</h3>
                                            <p>We are working hard to integrate {selectedProviderData.name} services. Stay tuned!</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* API URL */}
                                    <div className="config-section">
                                        <div className="section-title">API URL</div>
                                        <Input 
                                            value={selectedProviderData.apiUrl}
                                            placeholder="Enter API URL"
                                            className="config-input"
                                        />
                                        <div className="api-example">
                                            API Example: {selectedProviderData.apiUrl}
                                        </div>
                                    </div>

                                    {/* API Key */}
                                    <div className="config-section">
                                        <div className="section-title">API Key</div>
                                        <Password 
                                            value={selectedProviderData.apiKey}
                                            placeholder="Enter API Key"
                                            className="config-input"
                                        />
                                        <div className="key-actions">
                                            <Space size="small">
                                                <Button 
                                                    type="primary" 
                                                    size="small"
                                                    icon={<CheckOutlined />}
                                                >
                                                    Verify Key
                                                </Button>
                                            </Space>
                                        </div>
                                        <div className="key-help">
                                            How to get: Please visit{' '}
                                            <a href="#" className="provider-link">
                                                {selectedProviderData.name}
                                            </a>
                                            {' '}to get your API Key
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Models; 