/**
 * Musubi - Anthropic Claude Integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class AnthropicService {
  private client: Anthropic | null = null;

  /**
   * Initialize Anthropic client
   */
  async connect(): Promise<boolean> {
    try {
      if (!appConfig.anthropic.apiKey) {
        throw new Error('Anthropic API key not configured');
      }

      this.client = new Anthropic({
        apiKey: appConfig.anthropic.apiKey,
      });

      logger.success('Anthropic connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Anthropic', error);
      return false;
    }
  }

  /**
   * Chat with Claude
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const messages = [
        ...(conversationHistory || []),
        {
          role: 'user' as const,
          content: userMessage,
        },
      ];

      const response = await this.client.messages.create({
        model: 'claude-4-5-sonnet-20250929',
        max_tokens: 4000,
        system: systemPrompt,
        messages,
      });

      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      return responseText;
    } catch (error) {
      logger.error('Failed to chat with Claude', error);
      throw error;
    }
  }

  /**
   * Chat with Claude - Streaming (Cursor-like real-time)
   */
  async chatStream(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    onChunk?: (text: string) => void
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const messages = [
        ...conversationHistory,
        {
          role: 'user' as const,
          content: userMessage,
        },
      ];

      const stream = await this.client.messages.stream({
        model: 'claude-4-5-sonnet-20250929',
        max_tokens: 100,
        system: systemPrompt,
        messages,
      });

      let fullText = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullText += text;
          
          if (onChunk) {
            onChunk(text);
          }
        }
      }

      return fullText;
    } catch (error) {
      logger.error('Failed to stream chat with Claude', error);
      throw error;
    }
  }

  /**
   * Classify conversation
   */
  async classifyConversation(
    conversationContent: string,
    projectOptions: string[]
  ): Promise<{
    project: string;
    confidence: number;
    reason: string;
  }> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const prompt = `以下の会話ログを分析し、最も適切なプロジェクトを判定してください。

プロジェクト候補:
${projectOptions.map((p, i) => `${i + 1}. ${p}`).join('\n')}

会話内容:
${conversationContent}

以下のJSON形式で回答してください:
{
  "project": "プロジェクト名",
  "confidence": 0.0-1.0の信頼度スコア,
  "reason": "判定理由（日本語で簡潔に）"
}`;

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse classification response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return result;
    } catch (error) {
      logger.error('Failed to classify conversation', error);
      throw error;
    }
  }

  /**
   * Batch classify conversations
   */
  async batchClassify(
    conversations: Array<{ id: string; content: string }>,
    projectOptions: string[],
    batchSize: number = 10
  ): Promise<Map<string, { project: string; confidence: number; reason: string }>> {
    const results = new Map();
    
    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(conversations.length / batchSize)}`);

      for (const conv of batch) {
        try {
          const result = await this.classifyConversation(conv.content, projectOptions);
          results.set(conv.id, result);
        } catch (error) {
          logger.warn(`Failed to classify conversation ${conv.id}`, error);
          results.set(conv.id, {
            project: 'uncategorized',
            confidence: 0,
            reason: 'Classification failed',
          });
        }

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export const anthropicService = new AnthropicService();

