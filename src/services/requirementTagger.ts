/**
 * Requirement Tagger Service
 * 要望を分析し、確信度・重要度・タスク種別をタグ付けする
 */

import { anthropicService } from '../integrations/anthropic.js';
import { logger } from '../utils/logger.js';
import { RequirementTag } from '../types/requirement.js';

class RequirementTagger {
  /**
   * 要望テキストを分析してタグ付けする
   */
  async tagRequirement(
    id: string,
    content: string,
    source: 'cursor' | 'evaluation',
    project?: string
  ): Promise<RequirementTag> {
    logger.info(`[RequirementTagger] Tagging requirement: "${content.substring(0, 50)}..."`);

    try {
      await anthropicService.connect();

      const prompt = `以下のテキストを分析し、これが「ユーザーの要望」かどうかを判定してください。

テキスト: ${content}

以下の形式でJSON出力してください：
{
  "isRequirement": true/false,
  "confidence": 0.0-1.0,
  "importance": 0.0-1.0,
  "taskType": "feature/bugfix/improvement/research/other",
  "reasoning": {
    "whyConfident": "この確信度の理由",
    "whyImportant": "この重要度の理由",
    "suggestedPriority": 1-5
  }
}

判定基準：
- confidence: 明確な要望表現（「作って」「実装して」「ほしい」等）があれば高い
- importance: システムの核心機能、ユーザー体験への影響度、緊急性で判断
- taskType: 新機能=feature、バグ修正=bugfix、改善=improvement、調査=research
- suggestedPriority: 1=最優先、5=低優先

JSONのみを出力してください。説明は不要です。`;

      const response = await anthropicService.chat(
        'あなたは要望分析の専門家です。JSON形式で出力してください。',
        prompt,
        []
      );

      // JSONを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // 要望でない場合は低い確信度を設定
      if (!analysis.isRequirement) {
        analysis.confidence = Math.min(analysis.confidence, 0.3);
      }

      const tag: RequirementTag = {
        id,
        content,
        source,
        project,
        confidence: analysis.confidence,
        importance: analysis.importance,
        implementationStatus: 'not_started',
        taskType: analysis.taskType,
        extractedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        relatedRequirements: [],
        reasoning: analysis.reasoning,
      };

      logger.info(
        `[RequirementTagger] Tagged: confidence=${(analysis.confidence * 100).toFixed(0)}%, ` +
        `importance=${(analysis.importance * 100).toFixed(0)}%, type=${analysis.taskType}`
      );

      return tag;

    } catch (error) {
      logger.error('[RequirementTagger] Tagging failed, using fallback', error);

      // フォールバック: キーワードベースの簡易判定
      const requirementKeywords = ['作って', '作成', '実装', '追加', 'ほしい', '機能', '改善', '修正', 'バグ'];
      const hasKeyword = requirementKeywords.some(kw => content.includes(kw));
      
      const urgentKeywords = ['緊急', '至急', '早急', 'すぐ', '今すぐ', '重要'];
      const isUrgent = urgentKeywords.some(kw => content.includes(kw));

      return {
        id,
        content,
        source,
        project,
        confidence: hasKeyword ? 0.6 : 0.3,
        importance: isUrgent ? 0.8 : 0.5,
        implementationStatus: 'not_started',
        taskType: content.includes('バグ') || content.includes('エラー') ? 'bugfix' : 'feature',
        extractedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        relatedRequirements: [],
        reasoning: {
          whyConfident: hasKeyword ? 'キーワードベースの判定' : '要望キーワードなし',
          whyImportant: isUrgent ? '緊急キーワードあり' : '通常の要望',
          suggestedPriority: isUrgent ? 1 : 3,
        },
      };
    }
  }

  /**
   * 複数の要望を一括でタグ付け
   */
  async tagRequirements(
    requirements: Array<{ id: string; content: string; source: 'cursor' | 'evaluation'; project?: string }>
  ): Promise<RequirementTag[]> {
    logger.info(`[RequirementTagger] Batch tagging ${requirements.length} requirements`);

    const tagged: RequirementTag[] = [];

    for (const req of requirements) {
      try {
        const tag = await this.tagRequirement(req.id, req.content, req.source, req.project);
        tagged.push(tag);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`[RequirementTagger] Failed to tag requirement ${req.id}`, error);
      }
    }

    logger.info(
      `[RequirementTagger] Tagged ${tagged.length}/${requirements.length} requirements. ` +
      `High confidence: ${tagged.filter(t => t.confidence >= 0.7).length}, ` +
      `High importance: ${tagged.filter(t => t.importance >= 0.7).length}`
    );

    return tagged;
  }

  /**
   * 実装状況を更新
   */
  updateImplementationStatus(
    tag: RequirementTag,
    status: RequirementTag['implementationStatus']
  ): RequirementTag {
    return {
      ...tag,
      implementationStatus: status,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 関連要望を紐付け
   */
  linkRelatedRequirements(tag: RequirementTag, relatedIds: string[]): RequirementTag {
    return {
      ...tag,
      relatedRequirements: Array.from(new Set([...tag.relatedRequirements, ...relatedIds])),
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const requirementTagger = new RequirementTagger();

