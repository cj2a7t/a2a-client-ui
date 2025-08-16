export interface Message {
    id: string;
    content: string;
    type: 'user' | 'ai';
    timestamp: Date;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    inputValue: string;
    agentUrl: string;
} 