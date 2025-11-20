/**
 * Musubi - Capability Evaluation Service (Step 2)
 * 過去の成功/失敗履歴から客観的に能力を評価する外部評価器
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { anthropicService } from '../integrations/anthropic.js';
import { logger } from '../utils/logger.js';
import { projectManager } from './projectManager.js';
import {
  ImplementationHistory,
  CapabilityProfile,
  CapabilityEvaluation,
  SubTask,
  DEFAULT_CAPABILITIES,
  SuccessPattern,
  FailurePattern,
} from '../types/capability.js';

class CapabilityEvaluator {
  private historyPath: string;
  private profilePath: string;
  private history: ImplementationHistory[] = [];
  private profile: CapabilityProfile;

  constructor() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    this.historyPath = join(dataDir, 'implementation-history.json');
    this.profilePath = join(dataDir, 'capability-profile.json');
    
    this.loadHistory();
    this.loadProfile();
  }

  /**
   * Load implementation history from disk
   */
  private loadHistory(): void {
    try {
      if (existsSync(this.historyPath)) {
        const data = readFileSync(this.historyPath, 'utf-8');
        this.history = JSON.parse(data);
        logger.info(`[CapabilityEvaluator] Loaded ${this.history.length} implementation records`);
      } else {
        this.history = [];
        this.buildHistoryFromProjects();
      }
    } catch (error) {
      logger.error('[CapabilityEvaluator] Failed to load implementation history', error);
      this.history = [];
    }
  }

  /**
   * Build history from existing projects
   */
  private buildHistoryFromProjects(): void {
    const projects = projectManager.getAllProjects();
    
    for (const project of projects) {
      const evaluations = projectManager.getProjectEvaluations(project.id);
      
      for (const evaluation of evaluations) {
        const history: ImplementationHistory = {
          id: `${project.id}-${evaluation.id}`,
          requirementContent: project.name,
          projectId: project.id,
          projectName: project.name,
          result: evaluation.score >= 70 ? 'success' : evaluation.score >= 40 ? 'partial' : 'failure',
          score: evaluation.score,
          timestamp: evaluation.timestamp,
          feedback: evaluation.comments,
          capabilitiesUsed: this.inferCapabilitiesFromProject(project.name, evaluation.comments),
          dependenciesUsed: this.inferDependenciesFromProject(project.name),
          failureReason: evaluation.score < 70 ? evaluation.comments : undefined,
          subTasks: [],
        };
        
        this.history.push(history);
      }
    }
    
    this.saveHistory();
    logger.info(`[CapabilityEvaluator] Built history from ${this.history.length} project evaluations`);
  }

  /**
   * Infer capabilities from project name and feedback
   */
  private inferCapabilitiesFromProject(projectName: string, feedback?: string): string[] {
    const caps: string[] = [];
    const text = `${projectName} ${feedback || ''}`.toLowerCase();
    
    if (text.includes('react') || text.includes('component') || text.includes('ui')) caps.push('react-components');
    if (text.includes('typescript') || text.includes('型')) caps.push('typescript');
    if (text.includes('api') || text.includes('連携')) caps.push('api-integration');
    if (text.includes('database') || text.includes('supabase') || text.includes('db')) caps.push('database-operations');
    if (text.includes('file') || text.includes('ファイル')) caps.push('file-operations');
    if (text.includes('デザイン') || text.includes('design')) caps.push('ui-design');
    
    return caps;
  }

  /**
   * Infer dependencies from project name
   */
  private inferDependenciesFromProject(projectName: string): string[] {
    const deps: string[] = [];
    const text = projectName.toLowerCase();
    
    if (text.includes('notion')) deps.push('notion-api');
    if (text.includes('line')) deps.push('line-api');
    if (text.includes('supabase')) deps.push('supabase-client');
    
    return deps;
  }

  /**
   * Load capability profile from disk
   */
  private loadProfile(): void {
    try {
      if (existsSync(this.profilePath)) {
        const data = readFileSync(this.profilePath, 'utf-8');
        this.profile = JSON.parse(data);
        logger.info('[CapabilityEvaluator] Loaded capability profile');
      } else {
        this.profile = {
          capabilities: { ...DEFAULT_CAPABILITIES },
          availableDependencies: {
            npm: ['react', 'react-dom', 'next', 'typescript', '@supabase/supabase-js'],
            apis: ['anthropic', 'supabase'],
            libraries: ['fetch', 'localStorage', 'WebSockets'],
          },
          successPatterns: [],
          failurePatterns: [],
          totalImplementations: 0,
          successfulImplementations: 0,
          lastUpdated: new Date().toISOString(),
        };
        this.analyzePatterns();
        this.saveProfile();
      }
    } catch (error) {
      logger.error('[CapabilityEvaluator] Failed to load capability profile', error);
      this.profile = {
        capabilities: { ...DEFAULT_CAPABILITIES },
        availableDependencies: {
          npm: ['react', 'react-dom', 'next', 'typescript'],
          apis: ['anthropic', 'supabase'],
          libraries: ['fetch', 'localStorage'],
        },
        successPatterns: [],
        failurePatterns: [],
        totalImplementations: 0,
        successfulImplementations: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Analyze success and failure patterns from history
   */
  private analyzePatterns(): void {
    const successCases = this.history.filter(h => h.result === 'success');
    const failureCases = this.history.filter(h => h.result === 'failure');
    
    // Success patterns
    const successCapMap = new Map<string, number>();
    for (const success of successCases) {
      for (const cap of success.capabilitiesUsed) {
        successCapMap.set(cap, (successCapMap.get(cap) || 0) + 1);
      }
    }
    
    this.profile.successPatterns = Array.from(successCapMap.entries())
      .map(([cap, freq]) => ({
        pattern: cap,
        frequency: freq,
        examples: successCases.filter(s => s.capabilitiesUsed.includes(cap)).map(s => s.requirementContent).slice(0, 3),
        keyFactors: ['過去の成功実績あり'],
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    // Failure patterns
    const failureReasonMap = new Map<string, { count: number; examples: string[]; reasons: string[] }>();
    for (const failure of failureCases) {
      const key = failure.capabilitiesUsed.join(',') || 'unknown';
      const existing = failureReasonMap.get(key) || { count: 0, examples: [], reasons: [] };
      existing.count++;
      existing.examples.push(failure.requirementContent);
      if (failure.failureReason) existing.reasons.push(failure.failureReason);
      failureReasonMap.set(key, existing);
    }
    
    this.profile.failurePatterns = Array.from(failureReasonMap.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        examples: data.examples.slice(0, 3),
        rootCauses: data.reasons.slice(0, 3),
        suggestedFix: '詳細なサンプルコードとドキュメントが必要',
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    // Update capability levels
    for (const [capKey, capLevel] of Object.entries(this.profile.capabilities)) {
      const successCount = successCases.filter(s => s.capabilitiesUsed.includes(capKey)).length;
      const failureCount = failureCases.filter(f => f.capabilitiesUsed.includes(capKey)).length;
      
      capLevel.successCount = successCount;
      capLevel.failureCount = failureCount;
      capLevel.examples = successCases
        .filter(s => s.capabilitiesUsed.includes(capKey))
        .map(s => s.requirementContent)
        .slice(0, 5);
      
      // Update level based on success rate
      const total = successCount + failureCount;
      if (total > 0) {
        const successRate = successCount / total;
        if (successRate >= 0.8 && total >= 3) capLevel.level = 'advanced';
        else if (successRate >= 0.6) capLevel.level = 'intermediate';
        else if (successRate >= 0.3) capLevel.level = 'basic';
        else capLevel.level = 'none';
      }
    }
    
    this.profile.totalImplementations = this.history.length;
    this.profile.successfulImplementations = successCases.length;
    
    logger.info(
      `[CapabilityEvaluator] Analyzed patterns: ${this.profile.successPatterns.length} success, ` +
      `${this.profile.failurePatterns.length} failure`
    );
  }

  /**
   * Save history to disk
   */
  private saveHistory(): void {
    try {
      writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      logger.error('[CapabilityEvaluator] Failed to save history', error);
    }
  }

  /**
   * Save profile to disk
   */
  private saveProfile(): void {
    try {
      writeFileSync(this.profilePath, JSON.stringify(this.profile, null, 2));
    } catch (error) {
      logger.error('[CapabilityEvaluator] Failed to save profile', error);
    }
  }

  /**
   * Evaluate if Musubi can implement a requirement (STEP 2 - External Evaluation)
   */
  async evaluateCapability(requirement: string): Promise<CapabilityEvaluation> {
    logger.info(`[CapabilityEvaluator] Evaluating: "${requirement.substring(0, 50)}..."`);

    // Step 1: Break down into subtasks using AI
    const subtasks = await this.breakdownIntoSubtasks(requirement);

    // Step 2: Check dependencies
    const dependencyCheck = this.checkDependencies(requirement, subtasks);

    // Step 3: Find similar past implementations
    const similarImplementations = this.findSimilarImplementations(requirement);

    // Step 4: Calculate success rate from similar tasks
    const successRate = this.calculateSuccessRate(similarImplementations);

    // Step 5: Identify required and available capabilities
    const requiredCapabilities = this.extractRequiredCapabilities(subtasks);
    const availableCapabilities = requiredCapabilities.filter(cap => 
      this.profile.capabilities[cap] && 
      this.profile.capabilities[cap].level !== 'none'
    );
    const missingCapabilities = requiredCapabilities.filter(cap =>
      !this.profile.capabilities[cap] ||
      this.profile.capabilities[cap].level === 'none'
    );

    // Step 6: Calculate confidence based on OBJECTIVE factors
    const confidence = this.calculateObjectiveConfidence(
      subtasks,
      dependencyCheck,
      similarImplementations,
      availableCapabilities,
      missingCapabilities,
      successRate
    );

    // Step 7: Estimate actual success probability
    const estimatedSuccessProbability = this.estimateSuccessProbability(
      confidence,
      successRate,
      missingCapabilities.length,
      dependencyCheck.missing.length
    );

    // Step 8: Determine if can implement (STRICT criteria)
    const canImplement = 
      confidence > 0.7 && 
      missingCapabilities.length === 0 &&
      dependencyCheck.missing.length === 0 &&
      successRate > 0.5;

    // Step 9: Generate recommendation
    const recommendation = this.generateRecommendation(
      canImplement,
      missingCapabilities,
      dependencyCheck.missing,
      similarImplementations
    );

    const evaluation: CapabilityEvaluation = {
      requirementId: `req-${Date.now()}`,
      requirement,
      canImplement,
      confidence,
      reasoning: {
        subtasks,
        availableCapabilities,
        missingCapabilities,
        dependencyCheck,
        similarPastImplementations: similarImplementations,
        successRate,
      },
      recommendation,
      estimatedSuccessProbability,
    };

    logger.info(
      `[CapabilityEvaluator] Result: ${canImplement ? 'CAN' : 'CANNOT'} implement ` +
      `(confidence: ${(confidence * 100).toFixed(0)}%, success rate: ${(successRate * 100).toFixed(0)}%, ` +
      `estimated success: ${(estimatedSuccessProbability * 100).toFixed(0)}%)`
    );

    return evaluation;
  }

  /**
   * Break down requirement into subtasks using AI
   */
  private async breakdownIntoSubtasks(requirement: string): Promise<SubTask[]> {
    try {
      await anthropicService.connect();

      const prompt = `以下の要望を、実装に必要なサブタスクに分解してください。

要望: ${requirement}

各サブタスクについて、以下の形式でJSON配列として出力してください：
[
  {
    "description": "タスクの説明",
    "complexity": "simple/medium/complex",
    "required": true/false,
    "requiredCapabilities": ["capability1", "capability2"],
    "estimatedEffort": 1-5
  }
]

利用可能な能力のリスト：
${Object.keys(this.profile.capabilities).join(', ')}

JSONのみを出力してください。説明は不要です。`;

      const response = await anthropicService.chat(
        'あなたはタスク分解の専門家です。JSON形式で出力してください。',
        prompt,
        []
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse subtasks from AI response');
      }

      const parsedSubtasks = JSON.parse(jsonMatch[0]);
      
      return parsedSubtasks.map((st: any, index: number) => ({
        id: `subtask-${Date.now()}-${index}`,
        description: st.description,
        complexity: st.complexity || 'medium',
        required: st.required !== false,
        completed: false,
        requiredCapabilities: st.requiredCapabilities || [],
        estimatedEffort: st.estimatedEffort || 3,
      }));

    } catch (error) {
      logger.warn('[CapabilityEvaluator] AI subtask breakdown failed, using fallback', error);
      
      return [{
        id: `subtask-${Date.now()}-0`,
        description: requirement,
        complexity: 'medium',
        required: true,
        completed: false,
        requiredCapabilities: [],
        estimatedEffort: 3,
      }];
    }
  }

  /**
   * Check if required dependencies are available
   */
  private checkDependencies(
    requirement: string,
    subtasks: SubTask[]
  ): { available: string[]; missing: string[] } {
    const reqLower = requirement.toLowerCase();
    const available: string[] = [];
    const missing: string[] = [];

    const techMentions: { [key: string]: { type: keyof CapabilityProfile['availableDependencies']; name: string } } = {
      'notion': { type: 'apis', name: 'notion-api' },
      'supabase': { type: 'apis', name: 'supabase' },
      'line': { type: 'apis', name: 'line-api' },
      'openai': { type: 'apis', name: 'openai' },
      'gpt': { type: 'apis', name: 'openai' },
      '検索': { type: 'apis', name: 'web-search' },
      'search': { type: 'apis', name: 'web-search' },
    };

    for (const [keyword, dep] of Object.entries(techMentions)) {
      if (reqLower.includes(keyword)) {
        const isAvailable = this.profile.availableDependencies[dep.type]?.includes(dep.name);
        
        if (isAvailable) {
          available.push(dep.name);
        } else {
          missing.push(dep.name);
        }
      }
    }

    return { available, missing };
  }

  /**
   * Find similar past implementations
   */
  private findSimilarImplementations(requirement: string): ImplementationHistory[] {
    const reqLower = requirement.toLowerCase();
    const reqWords = reqLower.split(/\s+/).filter(w => w.length > 2);

    return this.history
      .map(history => {
        const historyLower = history.requirementContent.toLowerCase();
        const matchCount = reqWords.filter(word => historyLower.includes(word)).length;
        const similarity = matchCount / reqWords.length;
        
        return { history, similarity };
      })
      .filter(item => item.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => item.history);
  }

  /**
   * Calculate success rate from similar implementations
   */
  private calculateSuccessRate(similar: ImplementationHistory[]): number {
    if (similar.length === 0) return 0.5; // No data = 50% baseline
    
    const successCount = similar.filter(h => h.result === 'success').length;
    return successCount / similar.length;
  }

  /**
   * Extract required capabilities from subtasks
   */
  private extractRequiredCapabilities(subtasks: SubTask[]): string[] {
    const caps = new Set<string>();
    
    for (const task of subtasks) {
      for (const cap of task.requiredCapabilities) {
        caps.add(cap);
      }
    }
    
    return Array.from(caps);
  }

  /**
   * Calculate OBJECTIVE confidence (not AI's self-assessment)
   */
  private calculateObjectiveConfidence(
    subtasks: SubTask[],
    dependencyCheck: { available: string[]; missing: string[] },
    similarImplementations: ImplementationHistory[],
    availableCapabilities: string[],
    missingCapabilities: string[],
    successRate: number
  ): number {
    let confidence = 1.0;
    
    // Factor 1: Missing capabilities (heavy penalty)
    confidence -= 0.3 * missingCapabilities.length;
    
    // Factor 2: Missing dependencies (heavy penalty)
    confidence -= 0.25 * dependencyCheck.missing.length;
    
    // Factor 3: Task complexity
    const totalEffort = subtasks.reduce((sum, t) => sum + t.estimatedEffort, 0);
    if (totalEffort > 15) confidence -= 0.2;
    else if (totalEffort > 10) confidence -= 0.1;
    
    // Factor 4: Past success rate (major factor)
    if (similarImplementations.length > 0) {
      confidence = confidence * 0.6 + successRate * 0.4; // Weighted average
    }
    
    // Factor 5: Failure pattern match (penalty)
    const matchesFailurePattern = this.profile.failurePatterns.some(pattern => {
      const patternCaps = pattern.pattern.split(',');
      return patternCaps.some(cap => missingCapabilities.includes(cap));
    });
    if (matchesFailurePattern) confidence -= 0.2;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Estimate actual success probability (more conservative than confidence)
   */
  private estimateSuccessProbability(
    confidence: number,
    successRate: number,
    missingCapCount: number,
    missingDepCount: number
  ): number {
    // Start with confidence
    let probability = confidence;
    
    // Apply conservative adjustments
    if (missingCapCount > 0) probability *= 0.3; // Severe penalty
    if (missingDepCount > 0) probability *= 0.4; // Severe penalty
    
    // Factor in historical success rate
    if (successRate < 0.5) probability *= 0.6;
    
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Generate recommendation based on evaluation
   */
  private generateRecommendation(
    canImplement: boolean,
    missingCapabilities: string[],
    missingDependencies: string[],
    similarImplementations: ImplementationHistory[]
  ): string {
    if (canImplement) {
      return '過去の実績と現在の能力から、この要望は実装可能と判断されます。';
    }
    
    const recommendations: string[] = [];
    
    if (missingCapabilities.length > 0) {
      recommendations.push(
        `不足している能力: ${missingCapabilities.join('、')}。` +
        `これらの能力に関する学習データ（サンプルコード、ドキュメント）が必要です。`
      );
    }
    
    if (missingDependencies.length > 0) {
      recommendations.push(
        `必要な外部ツール: ${missingDependencies.join('、')}。` +
        `APIキーやアクセス権限の提供が必要です。`
      );
    }
    
    const failedSimilar = similarImplementations.filter(s => s.result === 'failure');
    if (failedSimilar.length > 0) {
      recommendations.push(
        `過去に類似タスクで${failedSimilar.length}件の失敗があります。` +
        `失敗要因: ${failedSimilar[0].failureReason || '不明'}`
      );
    }
    
    return recommendations.join(' ');
  }

  /**
   * Record implementation result
   */
  recordImplementation(history: ImplementationHistory): void {
    this.history.push(history);
    this.saveHistory();
    
    // Re-analyze patterns
    this.analyzePatterns();
    this.profile.lastUpdated = new Date().toISOString();
    this.saveProfile();
    
    logger.info(`[CapabilityEvaluator] Recorded implementation: ${history.result}`);
  }

  /**
   * Update available dependencies
   */
  updateDependencies(type: keyof CapabilityProfile['availableDependencies'], deps: string[]): void {
    this.profile.availableDependencies[type] = Array.from(
      new Set([...this.profile.availableDependencies[type], ...deps])
    );
    this.profile.lastUpdated = new Date().toISOString();
    this.saveProfile();
    
    logger.info(`[CapabilityEvaluator] Updated ${type} dependencies: ${deps.join(', ')}`);
  }

  /**
   * Get capability profile
   */
  getProfile(): CapabilityProfile {
    return this.profile;
  }

  /**
   * Get implementation history
   */
  getHistory(): ImplementationHistory[] {
    return this.history;
  }
}

export const capabilityEvaluator = new CapabilityEvaluator();
