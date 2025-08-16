import { Message } from "@/types/a2a";
import { TabKeyType } from "@/types/tab";
import { NaturFactory } from "@/utils/NaturFactory";
import { TabData } from "./tabdata";
import { AgentCard } from "@a2a-js/sdk";
import { createA2AClient } from "@/utils/a2aClient";

const getDefaultTabData = () => ({
    messages: [],
    isLoading: false,
    inputValue: "",
    agentUrl: "",
    isEnabled: false,
    agentConfig: {} as AgentCard,
    apiKey: "",
    isTabLoading: false,
});

const initState = {
    tabChat: {
        tabData: {},
    } as TabData<{
        messages: Message[];
        isLoading: boolean;
        inputValue: string;
        agentUrl: string;
        isEnabled: boolean;
        agentConfig: AgentCard;
        apiKey: string;
        isTabLoading: boolean;
    }>,
};

const state = initState;
type State = typeof state;
const createMap = NaturFactory.mapCreator(state);

const actions = NaturFactory.actionsCreator(state)({
    addMessage: (tabKey: TabKeyType, message: Message) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].messages.push(message);
        });
    },

    setInputValue: (tabKey: TabKeyType, value: string) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].inputValue = value;
        });
    },

    setIsLoading: (tabKey: TabKeyType, loading: boolean) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].isLoading = loading;
        });
    },

    clearMessages: (tabKey: TabKeyType) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].messages = [];
        });
    },

    setAgentUrl: (tabKey: TabKeyType, url: string) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].agentUrl = url;
            s.tabChat.tabData[realKey].isEnabled = false;
            s.tabChat.tabData[realKey].agentConfig = {} as AgentCard;
        });
    },

    toggleAgentEnabled: (tabKey: TabKeyType, enabled: boolean) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].isEnabled = enabled;
        });
    },

    onFetchAgentConfig: (tabKey: TabKeyType, agentUrl: string) => async (api) => {
        const realKey = tabKey ?? "default";
        let agentCard: AgentCard = {} as AgentCard;
        if (agentUrl) {
            const a2aClient = createA2AClient(agentUrl);
            agentCard = await a2aClient.getAgentCard();
        }
        console.log("agentCard", agentCard);
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].agentConfig = agentCard;
            s.tabChat.tabData[realKey].agentUrl = agentUrl;
        });
    },

    removeAgentConfig: (tabKey: TabKeyType) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            s.tabChat.tabData[realKey].agentConfig = {} as AgentCard;
            // Don't clear agentUrl, only clear configuration data
        });
    },

    setApiKey: (tabKey: TabKeyType, apiKey: string) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].apiKey = apiKey;
        });
    },

    updateMessageContent: (tabKey: TabKeyType, messageId: string, content: string) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            const message = s.tabChat.tabData[realKey].messages.find(m => m.id === messageId);
            if (message) {
                message.content = content;
            }
        });
    },

    setTabLoading: (tabKey: TabKeyType, loading: boolean) => async (api) => {
        const realKey = tabKey ?? "default";
        api.setState((s: State) => {
            if (!s.tabChat.tabData[realKey]) {
                s.tabChat.tabData[realKey] = getDefaultTabData();
            }
            s.tabChat.tabData[realKey].isTabLoading = loading;
        });
    },


});

export const maps = {
    mapChat: createMap(
        (state: State) => state.tabChat.tabData,
        (tabData: Record<string, { messages: Message[]; isLoading: boolean; inputValue: string; agentUrl: string; isEnabled: boolean; agentConfig: AgentCard; apiKey: string; isTabLoading: boolean }>) => {
            return (tabKey: TabKeyType) => {
                const key = tabKey ?? "default";
                const res = tabData[key];
                if (!res) {
                    return {
                        messages: [],
                        isLoading: false,
                        inputValue: "",
                        agentUrl: "",
                        isEnabled: false,
                        agentConfig: {} as AgentCard,
                        apiKey: "",
                        isTabLoading: false,
                    };
                }
                return res;
            };
        }
    ),
};

export default {
    name: "a2a",
    state,
    actions,
    maps,
}; 