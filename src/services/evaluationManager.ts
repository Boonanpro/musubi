/**
 * Musubi - Evaluation Manager
 * 
 * Manages evaluations and performs data quality analysis
 */

import { 
  Evaluation, 
  EvaluationStats, 
  DataCorrelation, 
  AnalysisResult,
  DataQualityRecommendation,
  SourceDataInfo,
  EvaluationFeedback 
} from '../types/evaluation.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { projectManager } from './projectManager.js';

export class EvaluationManager {
  private evaluations: Map<string, Evaluation> = new Map();

  /**
   * Add a new evaluation
   */
  addEvaluation(
    actionId: string,
    componentName: string,
    filePath: string,
    score: number,
    feedback: EvaluationFeedback,
    sourceData: SourceDataInfo,
    projectId?: string
  ): Evaluation {
    const evaluation: Evaluation = {
      id: uuidv4(),
      actionId,
      componentName,
      filePath,
      score,
      timestamp: new Date().toISOString(),
      feedback,
      sourceData,
    };

    this.evaluations.set(evaluation.id, evaluation);
    
    // Add to project manager
    try {
      projectManager.addEvaluation(evaluation, projectId);
    } catch (error) {
      logger.warn('Failed to add evaluation to project manager', error);
    }
    
    logger.success(`Evaluation recorded: ${componentName} - ${score} points`);

    return evaluation;
  }

  /**
   * Get evaluation by ID
   */
  getEvaluation(id: string): Evaluation | undefined {
    return this.evaluations.get(id);
  }

  /**
   * Get all evaluations
   */
  getAllEvaluations(): Evaluation[] {
    return Array.from(this.evaluations.values());
  }

  /**
   * Get evaluation statistics
   */
  getStats(): EvaluationStats {
    const evaluations = this.getAllEvaluations();
    const totalEvaluations = evaluations.length;

    if (totalEvaluations === 0) {
      return {
        totalEvaluations: 0,
        averageScore: 0,
        highScoreCount: 0,
        mediumScoreCount: 0,
        lowScoreCount: 0,
        commonStrengths: [],
        commonWeaknesses: [],
      };
    }

    const averageScore = evaluations.reduce((sum, e) => sum + e.score, 0) / totalEvaluations;
    const highScoreCount = evaluations.filter(e => e.score >= 85).length;
    const mediumScoreCount = evaluations.filter(e => e.score >= 60 && e.score < 85).length;
    const lowScoreCount = evaluations.filter(e => e.score < 60).length;

    // Aggregate strengths and weaknesses
    const strengthCounts = new Map<string, number>();
    const weaknessCounts = new Map<string, number>();

    evaluations.forEach(e => {
      e.feedback.strengths.forEach(s => {
        strengthCounts.set(s, (strengthCounts.get(s) || 0) + 1);
      });
      e.feedback.weaknesses.forEach(w => {
        weaknessCounts.set(w, (weaknessCounts.get(w) || 0) + 1);
      });
    });

    const commonStrengths = Array.from(strengthCounts.entries())
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const commonWeaknesses = Array.from(weaknessCounts.entries())
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEvaluations,
      averageScore,
      highScoreCount,
      mediumScoreCount,
      lowScoreCount,
      commonStrengths,
      commonWeaknesses,
    };
  }

  /**
   * Analyze data correlations
   */
  analyzeCorrelations(): DataCorrelation[] {
    const evaluations = this.getAllEvaluations();
    
    if (evaluations.length < 5) {
      logger.warn('Not enough evaluations for correlation analysis (need at least 5)');
      return [];
    }

    const highScoreEvaluations = evaluations.filter(e => e.score >= 85);
    const lowScoreEvaluations = evaluations.filter(e => e.score < 60);

    const correlations: DataCorrelation[] = [];

    // Analyze file path presence
    const filePathHighRate = highScoreEvaluations.filter(e => e.sourceData.hasFilePath).length / 
      (highScoreEvaluations.length || 1);
    const filePathLowRate = lowScoreEvaluations.filter(e => e.sourceData.hasFilePath).length / 
      (lowScoreEvaluations.length || 1);
    
    correlations.push({
      dataFeature: 'ファイルパス情報',
      highScoreRate: filePathHighRate,
      lowScoreRate: filePathLowRate,
      correlation: filePathHighRate - filePathLowRate,
      impact: Math.abs(filePathHighRate - filePathLowRate) > 0.3 ? 'high' : 
              Math.abs(filePathHighRate - filePathLowRate) > 0.15 ? 'medium' : 'low',
    });

    // Analyze code review presence
    const codeReviewHighRate = highScoreEvaluations.filter(e => e.sourceData.hasCodeReview).length / 
      (highScoreEvaluations.length || 1);
    const codeReviewLowRate = lowScoreEvaluations.filter(e => e.sourceData.hasCodeReview).length / 
      (lowScoreEvaluations.length || 1);
    
    correlations.push({
      dataFeature: 'コードレビューコメント',
      highScoreRate: codeReviewHighRate,
      lowScoreRate: codeReviewLowRate,
      correlation: codeReviewHighRate - codeReviewLowRate,
      impact: Math.abs(codeReviewHighRate - codeReviewLowRate) > 0.3 ? 'high' : 
              Math.abs(codeReviewHighRate - codeReviewLowRate) > 0.15 ? 'medium' : 'low',
    });

    // Analyze error handling examples
    const errorHandlingHighRate = highScoreEvaluations.filter(e => e.sourceData.hasErrorHandling).length / 
      (highScoreEvaluations.length || 1);
    const errorHandlingLowRate = lowScoreEvaluations.filter(e => e.sourceData.hasErrorHandling).length / 
      (lowScoreEvaluations.length || 1);
    
    correlations.push({
      dataFeature: 'エラーハンドリング例',
      highScoreRate: errorHandlingHighRate,
      lowScoreRate: errorHandlingLowRate,
      correlation: errorHandlingHighRate - errorHandlingLowRate,
      impact: Math.abs(errorHandlingHighRate - errorHandlingLowRate) > 0.3 ? 'high' : 
              Math.abs(errorHandlingHighRate - errorHandlingLowRate) > 0.15 ? 'medium' : 'low',
    });

    // Analyze test examples
    const testHighRate = highScoreEvaluations.filter(e => e.sourceData.hasTestExamples).length / 
      (highScoreEvaluations.length || 1);
    const testLowRate = lowScoreEvaluations.filter(e => e.sourceData.hasTestExamples).length / 
      (lowScoreEvaluations.length || 1);
    
    correlations.push({
      dataFeature: 'テストコード例',
      highScoreRate: testHighRate,
      lowScoreRate: testLowRate,
      correlation: testHighRate - testLowRate,
      impact: Math.abs(testHighRate - testLowRate) > 0.3 ? 'high' : 
              Math.abs(testHighRate - testLowRate) > 0.15 ? 'medium' : 'low',
    });

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Generate data quality recommendations
   */
  generateRecommendations(): DataQualityRecommendation[] {
    const correlations = this.analyzeCorrelations();
    const stats = this.getStats();
    const recommendations: DataQualityRecommendation[] = [];

    correlations.forEach(corr => {
      if (corr.impact === 'high' && corr.correlation > 0.2) {
        let priority: 'high' | 'medium' | 'low' = 'high';
        let implementationCost: 'high' | 'medium' | 'low' = 'medium';
        let proposedChange = '';
        let expectedImprovement = '';

        switch (corr.dataFeature) {
          case 'ファイルパス情報':
            proposedChange = 'Chekiのログ出力に必ずファイルパスを含める。形式: [file:パス]';
            expectedImprovement = `成果物スコア: ${Math.round(stats.averageScore)}点 → ${Math.round(stats.averageScore + 15)}点以上`;
            implementationCost = 'low';
            break;
          case 'コードレビューコメント':
            proposedChange = 'コードレビューでのコメントを開発ログに含める';
            expectedImprovement = `成果物スコア: ${Math.round(stats.averageScore)}点 → ${Math.round(stats.averageScore + 10)}点以上`;
            implementationCost = 'medium';
            break;
          case 'エラーハンドリング例':
            proposedChange = 'エラーハンドリングのコード例を開発ログに記録';
            expectedImprovement = `成果物スコア: ${Math.round(stats.averageScore)}点 → ${Math.round(stats.averageScore + 12)}点以上`;
            implementationCost = 'medium';
            break;
          case 'テストコード例':
            proposedChange = 'テストコードの実装例を開発ログに含める';
            expectedImprovement = `成果物スコア: ${Math.round(stats.averageScore)}点 → ${Math.round(stats.averageScore + 8)}点以上`;
            implementationCost = 'high';
            priority = 'medium';
            break;
        }

        recommendations.push({
          id: uuidv4(),
          priority,
          title: `${corr.dataFeature}の追加`,
          description: `高評価の成果物の${Math.round(corr.highScoreRate * 100)}%にこのデータが含まれていますが、低評価では${Math.round(corr.lowScoreRate * 100)}%しかありません。`,
          currentState: `現在の出現率: ${Math.round(corr.lowScoreRate * 100)}%`,
          proposedChange,
          expectedImprovement,
          implementationCost,
          evidence: [corr],
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get full analysis result
   */
  getAnalysis(): AnalysisResult {
    const stats = this.getStats();
    const correlations = this.analyzeCorrelations();
    const recommendations = this.generateRecommendations();

    let summary = '';
    
    if (stats.totalEvaluations === 0) {
      summary = 'まだ評価データがありません。コンポーネントを作成して評価してください。';
    } else if (stats.totalEvaluations < 5) {
      summary = `評価データ: ${stats.totalEvaluations}件。相関分析には最低5件必要です。`;
    } else {
      summary = `【分析結果】\n` +
        `総評価数: ${stats.totalEvaluations}件\n` +
        `平均スコア: ${Math.round(stats.averageScore)}点\n` +
        `高評価（85点以上）: ${stats.highScoreCount}件\n` +
        `低評価（60点未満）: ${stats.lowScoreCount}件\n\n` +
        `【重要な発見】\n` +
        recommendations.slice(0, 3).map((r, i) => 
          `${i + 1}. ${r.title}（優先度: ${r.priority}）\n   ${r.description}`
        ).join('\n\n');
    }

    return {
      timestamp: new Date().toISOString(),
      stats,
      correlations,
      recommendations,
      summary,
    };
  }
}

export const evaluationManager = new EvaluationManager();

