/**
 * Requirement Tagging System
 * 要望の確信度・重要度・実装状況を管理
 */

export interface RequirementTag {
  id: string;
  content: string;
  source: 'cursor' | 'evaluation';
  project?: string;
  
  // タグ情報
  confidence: number; // 0-1: これが本当に要望かどうかの確信度
  importance: number; // 0-1: 重要度
  implementationStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
  taskType: 'feature' | 'bugfix' | 'improvement' | 'research' | 'other';
  
  // メタ情報
  extractedAt: string;
  lastUpdated: string;
  relatedRequirements: string[]; // 関連する要望のID
  
  // AI分析結果
  reasoning: {
    whyConfident: string; // なぜこの確信度なのか
    whyImportant: string; // なぜこの重要度なのか
    suggestedPriority: number; // 1-5
  };
}

export interface RequirementExtractionResult {
  requirements: RequirementTag[];
  totalExtracted: number;
  highConfidence: number; // confidence >= 0.7
  highImportance: number; // importance >= 0.7
}

