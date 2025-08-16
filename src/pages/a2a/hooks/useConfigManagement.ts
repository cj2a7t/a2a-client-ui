import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { useTabKey } from '@/utils/tabkey';
import { useFlatInject } from '@/utils/hooks';

export const useConfigManagement = () => {
    const tabKey = useTabKey();
    const [store] = useFlatInject("a2a");
    const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
    const [configForm] = Form.useForm();

    const showConfigModal = useCallback(() => {
        const chatData = store.tabChat.tabData[tabKey];
        if (chatData) {
            configForm.resetFields();
            configForm.setFieldsValue({
                agentUrl: chatData.agentUrl,
                isEnabled: chatData.isEnabled,
                apiKey: chatData.apiKey
            });
        }
        setIsConfigModalVisible(true);
    }, [store, tabKey, configForm]);

    const handleConfigOk = useCallback(async () => {
        try {
            const values = await configForm.validateFields();
            await store.setApiKey(tabKey, values.apiKey);
            // Always save agent URL regardless of whether it's enabled
            await store.setAgentUrl(tabKey, values.agentUrl);
            
            if (values.isEnabled) {
                await store.onFetchAgentConfig(tabKey, values.agentUrl);
                await store.toggleAgentEnabled(tabKey, true);
            } else {
                // Clear configuration data when disabled, but keep URL
                await store.removeAgentConfig(tabKey);
                await store.toggleAgentEnabled(tabKey, false);
            }
            setIsConfigModalVisible(false);
            message.success('Configuration saved successfully');
        } catch (error) {
            console.error('Config validation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            message.error(`Config validation failed: ${errorMessage}`);
        }
    }, [store, tabKey, configForm]);

    const handleConfigCancel = useCallback(() => {
        setIsConfigModalVisible(false);
    }, []);

    const getInitialValues = useCallback(() => {
        const chatData = store.tabChat.tabData[tabKey];
        return {
            agentUrl: chatData?.agentUrl || '',
            isEnabled: chatData?.isEnabled || false,
            apiKey: chatData?.apiKey || '',
        };
    }, [store, tabKey]);

    return {
        isConfigModalVisible,
        configForm,
        showConfigModal,
        handleConfigOk,
        handleConfigCancel,
        getInitialValues,
    };
}; 