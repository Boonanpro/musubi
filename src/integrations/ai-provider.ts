
export type StreamEvent = 
  | { type: 'text', content: string }
  | { type: 'tool_use', name: string, id: string, input: any }
  | { type: 'stop', reason: string };

export interface AIProvider {
  connect(): Promise<boolean>;
  
  chatStream(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    tools?: any[]
  ): AsyncIterable<StreamEvent>;
}

export interface AIProviderConfig {
  apiKey: string;
  modelId: string;
  options?: Record<string, any>;
}
