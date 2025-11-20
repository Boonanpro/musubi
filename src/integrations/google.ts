
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIProviderConfig, StreamEvent } from './ai-provider.js';
import { logger } from '../utils/logger.js';

export class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI | null = null;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Google API key not configured');
      }

      this.client = new GoogleGenerativeAI(this.config.apiKey);

      // Try to list available models to verify the model ID
      try {
        const model = this.client.getGenerativeModel({ model: this.config.modelId });
        // Just verify the client is initialized, don't make a request yet
        logger.success('Google Gemini connected successfully');
      } catch (verifyError: any) {
        logger.warn(`[Google] Model ${this.config.modelId} might not be available. Error: ${verifyError.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Failed to connect to Google Gemini', error);
      return false;
    }
  }

  private convertTools(tools?: any[]): any {
    if (!tools) return undefined;
    return {
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      })),
    };
  }

  async *chatStream(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    tools?: any[]
  ): AsyncIterable<StreamEvent> {
    if (!this.client) {
      throw new Error('Google client not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ 
          model: this.config.modelId,
          systemInstruction: systemPrompt,
          tools: tools ? [this.convertTools(tools)] : undefined
      });

      // Split messages into history and last message
      const lastMessage = messages[messages.length - 1];
      const historyMessages = messages.slice(0, -1);

      const history = historyMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
      }));

      const chat = model.startChat({
        history: history,
      });

      const userMsgContent = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
      const result = await chat.sendMessageStream(userMsgContent);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { type: 'text', content: text };
        }

        const functionCalls = chunk.functionCalls();
        if (functionCalls) {
            for (const call of functionCalls) {
                yield {
                    type: 'tool_use',
                    name: call.name,
                    id: 'gemini-' + Date.now(), // Gemini doesn't provide ID in the same way
                    input: call.args
                };
            }
        }
      }
      yield { type: 'stop', reason: 'end_turn' };
    } catch (error: any) {
      logger.error('Failed to stream chat with Google Gemini', error);
      
      // Handle model not found errors
      if (error?.message?.includes('404') || error?.message?.includes('not found') || error?.message?.includes('is not found')) {
        throw new Error(
          `Google Gemini API Error: モデル "${this.config.modelId}" が見つかりません。` +
          `利用可能なモデルを確認するか、モデルIDが正しいか確認してください。` +
          `エラー詳細: ${error.message}`
        );
      }
      
      // Handle quota errors with better messaging
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('Quota exceeded')) {
        const retryDelay = error?.message?.match(/Please retry in ([\d.]+)s/)?.[1];
        const retryMsg = retryDelay ? `約${Math.ceil(parseFloat(retryDelay))}秒後に再試行してください。` : '';
        throw new Error(`Google Gemini APIのクォータ制限に達しました。${retryMsg}課金設定が有効になっているか、Google Cloud Console (https://console.cloud.google.com/) で確認してください。`);
      }
      
      throw error;
    }
  }
}
