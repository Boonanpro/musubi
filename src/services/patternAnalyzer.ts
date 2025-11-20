/**
 * Pattern Analyzer (Step 4)
 * 成功パターンと失敗パターンを分析し、Musubiの弱点を特定する
 */

import { logger } from '../utils/logger.js';
import { capabilityEvaluator } from './capabilityEvaluator.js';
import { ImplementationHistory, SuccessPattern, FailurePattern } from '../types/capability.js';

export interface WeaknessReport {
  weakCapabilities: Array<{
    capability: string;
    successRate: number;
    failureCount: number;
    commonIssues: string[];
    suggestedImprovement: string;
  }>;
  repeatedMistakes: Array<{
    mistake: string;
    frequency: number;
    examples: string[];
    rootCause: string;
  }>;
  strongCapabilities: Array<{
    capability: string;
    successRate: number;
    successCount: number;
  }>;
  overallSuccessRate: number;
  totalAnalyzed: number;
}

class PatternAnalyzer {
  /**
   * Analyze all patterns and generate weakness report
   */
  analyzeWeaknesses(): WeaknessReport {
    logger.info('[PatternAnalyzer] Analyzing success/failure patterns...');

    const history = capabilityEvaluator.getHistory();
    const profile = capabilityEvaluator.getProfile();

    // Analyze capabilities
    const capabilityStats = this.analyzeCapabilities(history);
    
    // Find repeated mistakes
    const repeatedMistakes = this.findRepeatedMistakes(history);

    // Identify weak and strong capabilities
    const weakCapabilities = capabilityStats
      .filter(c => c.successRate < 0.6 && c.totalCount >= 2)
      .map(c => ({
        capability: c.name,
        successRate: c.successRate,
        failureCount: c.failureCount,
        commonIssues: this.extractCommonIssues(history, c.name),
        suggestedImprovement: this.suggestImprovement(c.name, c.successRate),
      }))
      .sort((a, b) => a.successRate - b.successRate);

    const strongCapabilities = capabilityStats
      .filter(c => c.successRate >= 0.8 && c.totalCount >= 2)
      .map(c => ({
        capability: c.name,
        successRate: c.successRate,
        successCount: c.successCount,
      }))
      .sort((a, b) => b.successRate - a.successRate);

    const overallSuccessRate = history.length > 0
      ? history.filter(h => h.result === 'success').length / history.length
      : 0;

    const report: WeaknessReport = {
      weakCapabilities,
      repeatedMistakes,
      strongCapabilities,
      overallSuccessRate,
      totalAnalyzed: history.length,
    };

    logger.info(
      `[PatternAnalyzer] Analysis complete: ` +
      `${weakCapabilities.length} weak capabilities, ` +
      `${repeatedMistakes.length} repeated mistakes, ` +
      `${strongCapabilities.length} strong capabilities`
    );

    return report;
  }

  /**
   * Analyze capabilities from history
   */
  private analyzeCapabilities(history: ImplementationHistory[]): Array<{
    name: string;
    successCount: number;
    failureCount: number;
    totalCount: number;
    successRate: number;
  }> {
    const capMap = new Map<string, { success: number; failure: number }>();

    for (const impl of history) {
      for (const cap of impl.capabilitiesUsed) {
        const stats = capMap.get(cap) || { success: 0, failure: 0 };
        
        if (impl.result === 'success') {
          stats.success++;
        } else if (impl.result === 'failure') {
          stats.failure++;
        }
        
        capMap.set(cap, stats);
      }
    }

    return Array.from(capMap.entries()).map(([name, stats]) => ({
      name,
      successCount: stats.success,
      failureCount: stats.failure,
      totalCount: stats.success + stats.failure,
      successRate: stats.success / (stats.success + stats.failure),
    }));
  }

  /**
   * Find repeated mistakes
   */
  private findRepeatedMistakes(history: ImplementationHistory[]): Array<{
    mistake: string;
    frequency: number;
    examples: string[];
    rootCause: string;
  }> {
    const failures = history.filter(h => h.result === 'failure' && h.failureReason);
    
    // Group by similar failure reasons
    const mistakeMap = new Map<string, string[]>();
    
    for (const failure of failures) {
      if (!failure.failureReason) continue;
      
      // Simple grouping by keywords
      const keywords = this.extractFailureKeywords(failure.failureReason);
      const key = keywords.join('_');
      
      const examples = mistakeMap.get(key) || [];
      examples.push(failure.requirementContent);
      mistakeMap.set(key, examples);
    }

    return Array.from(mistakeMap.entries())
      .filter(([_, examples]) => examples.length >= 2) // Repeated at least twice
      .map(([key, examples]) => ({
        mistake: key.replace(/_/g, ' '),
        frequency: examples.length,
        examples: examples.slice(0, 3),
        rootCause: this.inferRootCause(key, examples),
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Extract failure keywords
   */
  private extractFailureKeywords(reason: string): string[] {
    const keywords: string[] = [];
    const lower = reason.toLowerCase();
    
    if (lower.includes('api') || lower.includes('連携')) keywords.push('api');
    if (lower.includes('デザイン') || lower.includes('ui')) keywords.push('ui');
    if (lower.includes('データ') || lower.includes('database')) keywords.push('data');
    if (lower.includes('エラー') || lower.includes('バグ')) keywords.push('error');
    if (lower.includes('実装') || lower.includes('機能')) keywords.push('implementation');
    if (lower.includes('不足') || lower.includes('足りない')) keywords.push('insufficient');
    
    return keywords.length > 0 ? keywords : ['other'];
  }

  /**
   * Infer root cause from repeated mistakes
   */
  private inferRootCause(mistakeKey: string, examples: string[]): string {
    const key = mistakeKey.toLowerCase();
    
    if (key.includes('api')) {
      return 'API仕様の理解不足、またはAPIキー/認証情報の不足';
    }
    if (key.includes('ui')) {
      return 'デザインパターンやUIライブラリの知識不足';
    }
    if (key.includes('data')) {
      return 'データ構造の設計ミス、またはデータベーススキーマの理解不足';
    }
    if (key.includes('error')) {
      return 'エラーハンドリングの実装漏れ、またはエッジケースの考慮不足';
    }
    if (key.includes('insufficient')) {
      return '要件定義の不明確さ、または必要な情報の不足';
    }
    
    return '原因不明。詳細な分析が必要';
  }

  /**
   * Extract common issues for a capability
   */
  private extractCommonIssues(history: ImplementationHistory[], capability: string): string[] {
    const failures = history.filter(
      h => h.result === 'failure' && 
      h.capabilitiesUsed.includes(capability) && 
      h.failureReason
    );

    const issues = failures
      .map(f => f.failureReason!)
      .slice(0, 3);

    return issues;
  }

  /**
   * Suggest improvement for weak capability
   */
  private suggestImprovement(capability: string, successRate: number): string {
    const severity = successRate < 0.3 ? '重大' : successRate < 0.5 ? '中程度' : '軽度';
    
    const suggestions: { [key: string]: string } = {
      'react-components': 'Reactのベストプラクティス、コンポーネント設計パターン、Hooks の使い方に関する学習が必要',
      'typescript': 'TypeScriptの型システム、ジェネリクス、型推論に関する理解を深める必要がある',
      'ui-design': 'デザインシステム、カラー理論、レイアウト原則の学習が必要。参考デザインの提供が有効',
      'api-integration': 'API仕様書の読み方、認証フロー、エラーハンドリングの実装例が必要',
      'database-operations': 'データベース設計、正規化、クエリ最適化に関する知識が不足',
      'file-operations': 'ファイルシステムAPI、ストリーム処理、エラーハンドリングの実装例が必要',
    };

    const suggestion = suggestions[capability] || `${capability} に関する具体的な実装例とドキュメントが必要`;
    
    return `【${severity}】${suggestion}`;
  }

  /**
   * Generate improvement plan
   */
  generateImprovementPlan(report: WeaknessReport): string[] {
    const plan: string[] = [];

    // Priority 1: Repeated mistakes
    if (report.repeatedMistakes.length > 0) {
      plan.push('## 最優先: 繰り返しているミスの修正');
      for (const mistake of report.repeatedMistakes.slice(0, 3)) {
        plan.push(
          `- **${mistake.mistake}** (${mistake.frequency}回発生)\n` +
          `  原因: ${mistake.rootCause}\n` +
          `  対策: この種類のタスクに関する詳細なサンプルコードとチェックリストが必要`
        );
      }
    }

    // Priority 2: Weak capabilities
    if (report.weakCapabilities.length > 0) {
      plan.push('\n## 次の優先: 弱い能力の強化');
      for (const weak of report.weakCapabilities.slice(0, 3)) {
        plan.push(
          `- **${weak.capability}** (成功率: ${(weak.successRate * 100).toFixed(0)}%)\n` +
          `  ${weak.suggestedImprovement}`
        );
      }
    }

    // Priority 3: Leverage strong capabilities
    if (report.strongCapabilities.length > 0) {
      plan.push('\n## 活用すべき強み');
      for (const strong of report.strongCapabilities.slice(0, 3)) {
        plan.push(
          `- **${strong.capability}** (成功率: ${(strong.successRate * 100).toFixed(0)}%)\n` +
          `  この能力を活かせるタスクを優先的に実装すべき`
        );
      }
    }

    return plan;
  }
}

export const patternAnalyzer = new PatternAnalyzer();

