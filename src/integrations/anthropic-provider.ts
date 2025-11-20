
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderConfig, StreamEvent } from './ai-provider.js';
import { logger } from '../utils/logger.js';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic | null = null;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Anthropic API key not configured');
      }

      this.client = new Anthropic({
        apiKey: this.config.apiKey,
      });

      logger.success('Anthropic connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Anthropic', error);
      return false;
    }
  }

  async *chatStream(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    tools?: any[]
  ): AsyncIterable<StreamEvent> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const stream = await this.client.messages.stream({
        model: this.config.modelId,
        max_tokens: 4000,
        system: systemPrompt,
        messages: messages as any,
        tools: tools as any,
      });

      let currentTool: { name: string; id: string; inputJson: string } | null = null;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield { type: 'text', content: chunk.delta.text };
        }

        if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
          currentTool = {
            name: chunk.content_block.name,
            id: chunk.content_block.id,
            inputJson: '',
          };
        }

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'input_json_delta') {
          if (currentTool) {
            currentTool.inputJson += chunk.delta.partial_json;
          }
        }

        if (chunk.type === 'content_block_stop') {
          if (currentTool) {
            try {
              const input = JSON.parse(currentTool.inputJson);
              yield {
                type: 'tool_use',
                name: currentTool.name,
                id: currentTool.id,
                input,
              };
            } catch (e) {
              logger.error('Failed to parse tool input JSON', e);
            }
            currentTool = null;
          }
        }
        
        if (chunk.type === 'message_delta') {
             if (chunk.delta.stop_reason) {
                 yield { type: 'stop', reason: chunk.delta.stop_reason };
             }
        }
        
        // Ensure we catch message_stop if message_delta didn't provide reason (sometimes happens)
        if (chunk.type === 'message_stop') {
             // message_stop event doesn't carry reason in JS SDK stream?
             // It seems message_delta carries it.
             // We'll yield a generic stop if we haven't seen one.
        }
      }
    } catch (error) {
      logger.error('Failed to stream chat with Claude', error);
      throw error;
    }
  }
}
