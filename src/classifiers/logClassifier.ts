/**
 * Musubi - Log Classification Logic
 */

import { ConversationLog, ClassificationResult, Project } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { anthropicService } from '../integrations/anthropic.js';

export class LogClassifier {
  private projects: Project[];
  private useAI: boolean;

  constructor(projects: Project[], useAI: boolean = true) {
    this.projects = projects;
    this.useAI = useAI;
  }

  /**
   * Classify a single conversation using keyword-based approach
   */
  private classifyByKeywords(conversation: ConversationLog): {
    project: string;
    confidence: number;
    reason: string;
  } {
    const content = conversation.content.toLowerCase();

    let bestMatch = {
      project: 'uncategorized',
      confidence: 0,
      reason: 'No matching keywords found',
    };

    for (const project of this.projects) {
      let matchCount = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of project.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }

      // Check pattern matching
      for (const pattern of project.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content)) {
          matchCount += 2; // Patterns have higher weight
          matchedKeywords.push(`pattern:${pattern}`);
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(matchCount / (project.keywords.length + project.patterns.length), 1);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            project: project.name,
            confidence,
            reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Classify a single conversation using AI
   */
  private async classifyByAI(conversation: ConversationLog): Promise<{
    project: string;
    confidence: number;
    reason: string;
  }> {
    try {
      const projectNames = this.projects.map(p => p.name);
      projectNames.push('uncategorized');

      const result = await anthropicService.classifyConversation(
        conversation.content,
        projectNames
      );

      return result;
    } catch (error) {
      logger.warn(`AI classification failed for conversation ${conversation.id}, falling back to keywords`);
      return this.classifyByKeywords(conversation);
    }
  }

  /**
   * Classify a single conversation
   */
  async classify(conversation: ConversationLog): Promise<ClassificationResult> {
    let result;

    if (this.useAI) {
      result = await this.classifyByAI(conversation);
    } else {
      result = this.classifyByKeywords(conversation);
    }

    return {
      conversationId: conversation.id,
      originalProject: conversation.project || 'uncategorized',
      predictedProject: result.project,
      confidence: result.confidence,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Classify multiple conversations
   */
  async classifyBatch(
    conversations: ConversationLog[],
    progressCallback?: (current: number, total: number) => void
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    logger.section('Starting Classification');
    logger.info(`Total conversations to classify: ${conversations.length}`);
    logger.info(`Using ${this.useAI ? 'AI-powered' : 'keyword-based'} classification`);

    for (let i = 0; i < conversations.length; i++) {
      const conversation = conversations[i];
      
      try {
        const result = await this.classify(conversation);
        results.push(result);

        if (progressCallback) {
          progressCallback(i + 1, conversations.length);
        }

        if ((i + 1) % 100 === 0) {
          logger.info(`Progress: ${i + 1}/${conversations.length} (${Math.round((i + 1) / conversations.length * 100)}%)`);
        }

        // Rate limiting for AI calls only
        // (keyword-based classification doesn't need delays)
      } catch (error) {
        logger.error(`Failed to classify conversation ${conversation.id}`, error);
        results.push({
          conversationId: conversation.id,
          originalProject: 'uncategorized',
          predictedProject: 'uncategorized',
          confidence: 0,
          reason: 'Classification error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Hybrid classification: Use keywords first, then AI for low confidence
   */
  async classifyHybrid(
    conversations: ConversationLog[],
    confidenceThreshold: number = 0.6
  ): Promise<ClassificationResult[]> {
    logger.section('Hybrid Classification');
    logger.info('Step 1: Keyword-based classification');

    const results: ClassificationResult[] = [];
    const lowConfidenceConversations: ConversationLog[] = [];

    // First pass: keyword-based
    for (const conversation of conversations) {
      const keywordResult = this.classifyByKeywords(conversation);
      
      if (keywordResult.confidence >= confidenceThreshold) {
        results.push({
          conversationId: conversation.id,
          originalProject: conversation.project || 'uncategorized',
          predictedProject: keywordResult.project,
          confidence: keywordResult.confidence,
          reason: keywordResult.reason + ' (keyword-based)',
          timestamp: new Date().toISOString(),
        });
      } else {
        lowConfidenceConversations.push(conversation);
      }
    }

    logger.info(`High confidence: ${results.length}, Low confidence: ${lowConfidenceConversations.length}`);

    // Second pass: AI for low confidence
    if (this.useAI && lowConfidenceConversations.length > 0) {
      logger.info('Step 2: AI classification for low confidence cases');
      
      for (let i = 0; i < lowConfidenceConversations.length; i++) {
        const conversation = lowConfidenceConversations[i];
        const aiResult = await this.classifyByAI(conversation);
        results.push({
          conversationId: conversation.id,
          originalProject: conversation.project || 'uncategorized',
          predictedProject: aiResult.project,
          confidence: aiResult.confidence,
          reason: aiResult.reason + ' (AI-powered)',
          timestamp: new Date().toISOString(),
        });

        if ((i + 1) % 10 === 0) {
          logger.info(`AI classification progress: ${i + 1}/${lowConfidenceConversations.length}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

