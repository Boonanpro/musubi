/**
 * Musubi - Evaluation Types
 * 
 * Types for evaluating generated code and analyzing data quality
 */

export interface Evaluation {
  id: string;
  actionId: string;
  componentName: string;
  filePath: string;
  score: number; // 1-100
  timestamp: string;
  feedback: EvaluationFeedback;
  sourceData: SourceDataInfo;
}

export interface EvaluationFeedback {
  strengths: string[]; // 良かった点
  weaknesses: string[]; // 改善点
  comments: string; // 自由コメント
}

export interface SourceDataInfo {
  logCount: number; // 使用したログ数
  hasFilePath: boolean; // ファイルパス情報の有無
  hasCodeReview: boolean; // コードレビュー情報の有無
  hasErrorHandling: boolean; // エラーハンドリング例の有無
  hasTestExamples: boolean; // テストコード例の有無
  dataQuality: 'high' | 'medium' | 'low'; // データ品質
}

export interface EvaluationStats {
  totalEvaluations: number;
  averageScore: number;
  highScoreCount: number; // 85点以上
  mediumScoreCount: number; // 60-84点
  lowScoreCount: number; // 60点未満
  commonStrengths: Array<{ item: string; count: number }>;
  commonWeaknesses: Array<{ item: string; count: number }>;
}

export interface DataCorrelation {
  dataFeature: string; // データの特徴
  highScoreRate: number; // 高評価での出現率
  lowScoreRate: number; // 低評価での出現率
  correlation: number; // 相関係数 (-1 to 1)
  impact: 'high' | 'medium' | 'low'; // 影響度
}

export interface DataQualityRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentState: string;
  proposedChange: string;
  expectedImprovement: string; // 期待される改善効果
  implementationCost: 'high' | 'medium' | 'low';
  evidence: DataCorrelation[];
}

export interface AnalysisResult {
  timestamp: string;
  stats: EvaluationStats;
  correlations: DataCorrelation[];
  recommendations: DataQualityRecommendation[];
  summary: string;
}

