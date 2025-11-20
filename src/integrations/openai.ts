
import OpenAI from 'openai';
import { AIProvider, AIProviderConfig, StreamEvent } from './ai-provider.js';
import { logger } from '../utils/logger.js';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      });

      logger.success('OpenAI connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to OpenAI', error);
      return false;
    }
  }

  private convertTools(tools?: any[]): any[] | undefined {
    if (!tools) return undefined;
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  async *chatStream(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    tools?: any[]
  ): AsyncIterable<StreamEvent> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Convert history to OpenAI format
      const openAIMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => {
            if (typeof msg.content === 'string') {
                return { role: msg.role, content: msg.content };
            }
            // Handle complex content (tool results etc) if needed
            // For now assume string for simplicity or basic mapping
            return { role: msg.role, content: JSON.stringify(msg.content) };
        }),
      ] as any[];

      const openAITools = this.convertTools(tools);

      // Note: gpt-5.1-codex might not exist or might be a chat model
      // Try chat/completions first, fall back to completions if needed

      let stream;
      let isCodex = false;
      
      try {
        stream = await this.client.chat.completions.create({
          model: this.config.modelId,
          messages: openAIMessages,
          stream: true,
          tools: openAITools,
          reasoning_effort: 'high', // As requested for GPT-5.1
        } as any);
      } catch (error: any) {
        // Check if this is a Codex model (non-chat model)
        if (error?.message?.includes('not a chat model') || error?.message?.includes('v1/completions')) {
          logger.info(`[OpenAI] Model ${this.config.modelId} is not a chat model, using completions endpoint...`);
          isCodex = true;
          
          // Convert messages to prompt format for completions endpoint
          const prompt = openAIMessages.map(msg => {
            if (msg.role === 'system') {
              return `System: ${msg.content}\n\n`;
            } else if (msg.role === 'user') {
              return `User: ${msg.content}\n\n`;
            } else {
              return `Assistant: ${msg.content}\n\n`;
            }
          }).join('') + 'Assistant:';

          try {
            stream = await this.client.completions.create({
              model: this.config.modelId,
              prompt: prompt,
              stream: true,
              max_tokens: 4000,
            } as any);
          } catch (codexError: any) {
            // If completions also fails, try to get available models
            logger.error(`[OpenAI] Model ${this.config.modelId} not supported in completions endpoint: ${codexError.message}`);
            
            // Try listing models to help debug
            try {
              const models = await this.client.models.list();
              const modelIds = models.data.map(m => m.id).filter(id => 
                id.includes('codex') || id.includes('gpt-5') || id.includes('gpt-4')
              );
              
              if (modelIds.length > 0) {
                throw new Error(
                  `Model "${this.config.modelId}" is not available. ` +
                  `Available similar models: ${modelIds.slice(0, 5).join(', ')}. ` +
                  `Please verify the model ID or check OpenAI API documentation.`
                );
              }
            } catch (listError) {
              // If listing fails, just show the original error
            }
            
            throw new Error(
              `OpenAI API Error: Model "${this.config.modelId}" is not supported in either ` +
              `v1/chat/completions or v1/completions endpoints. ` +
              `Please verify the model ID. Error: ${codexError.message}`
            );
          }
        } else if (error?.message?.includes('404') || error?.message?.includes('not supported')) {
          // Try without reasoning_effort
          logger.warn(`[OpenAI] Model ${this.config.modelId} might not support reasoning_effort, trying without it...`);
          try {
            stream = await this.client.chat.completions.create({
              model: this.config.modelId,
              messages: openAIMessages,
              stream: true,
              tools: openAITools,
            } as any);
          } catch (retryError: any) {
            throw new Error(`OpenAI API Error: ${retryError.message}. Model "${this.config.modelId}" might not exist or might not be accessible. Please verify the model ID.`);
          }
        } else {
          throw new Error(`OpenAI API Error: ${error.message}`);
        }
      }

      // Handle Codex (completions endpoint) differently
      if (isCodex) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.text;
          if (text) {
            yield { type: 'text', content: text };
          }
          if (chunk.choices[0]?.finish_reason) {
            yield { type: 'stop', reason: chunk.choices[0].finish_reason };
          }
        }
        return;
      }

      // Handle chat models (chat/completions endpoint)
      let currentTool: { index: number; name: string; id: string; args: string } | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          yield { type: 'text', content: delta.content };
        }

        if (delta?.tool_calls) {
          const toolCall = delta.tool_calls[0];
          
          if (toolCall.id) {
            // New tool call
            if (currentTool) {
                // Yield previous tool call if any (though OpenAI usually sends one at a time in stream?)
                // Actually OpenAI can send multiple. But usually sequential in stream.
                // Let's assume we need to yield when it's done.
                // But we don't get a clear "stop" for tool call in delta.
                // We have to accumulate until the next tool call or finish.
            }
            currentTool = {
              index: toolCall.index,
              name: toolCall.function?.name || '',
              id: toolCall.id,
              args: toolCall.function?.arguments || '',
            };
          } else if (currentTool && toolCall.function?.arguments) {
            currentTool.args += toolCall.function.arguments;
          }
        }

        if (chunk.choices[0]?.finish_reason === 'tool_calls' || chunk.choices[0]?.finish_reason === 'stop') {
             if (currentTool) {
                 try {
                     const input = JSON.parse(currentTool.args);
                     yield {
                         type: 'tool_use',
                         name: currentTool.name,
                         id: currentTool.id,
                         input: input
                     };
                 } catch (e) {
                     logger.error('Failed to parse OpenAI tool args', e);
                 }
                 currentTool = null;
             }
             yield { type: 'stop', reason: chunk.choices[0].finish_reason };
        }
      }
    } catch (error) {
      logger.error('Failed to stream chat with OpenAI', error);
      throw error;
    }
  }
}
