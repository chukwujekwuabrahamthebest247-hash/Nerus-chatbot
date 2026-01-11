
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    mimeType: string;
    name?: string;
  }[];
  groundingMetadata?: any;
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  provider: 'gemini' | 'openrouter';
  settings: ChatSettings;
}

export interface ChatSettings {
  provider: 'gemini' | 'openrouter';
  useSearch: boolean;
  thinkingBudget: number;
  temperature: number;
  openRouterKey?: string;
  selectedOpenRouterModel?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}
