/**
 * Musubi - Analysis API Routes
 * Stream-based requirement analysis from Cursor conversations
 */

import { Router, Request, Response } from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import { projectManager } from '../../services/projectManager.js';
import { capabilityEvaluator } from '../../services/capabilityEvaluator.js';
import { requirementTagger } from '../../services/requirementTagger.js';
import { autoInfoGatherer } from '../../services/autoInfoGatherer.js';
import { patternAnalyzer } from '../../services/patternAnalyzer.js';
import { supabaseService } from '../../integrations/supabase.js';
import { anthropicService } from '../../integrations/anthropic.js';

export const analysisRouter = Router();

interface Requirement {
  id: string;
  content: string;
  source: string; // 'cursor' or 'evaluation'
  project?: string;
}

interface AnalysisStep {
  step: number;
  title: string;
  message: string;
  data?: any;
}

type RequirementCategory =
  | 'n8n-log-timestamp'
  | 'n8n-log-file-error'
  | 'n8n-log-general'
  | 'composer-timeline'
  | 'os-design'
  | 'notion-integration'
  | 'line-integration'
  | 'ui-design'
  | 'search-capability'
  | 'file-processing'
  | 'database-optimization'
  | 'api-integration'
  | 'automation'
  | 'error-handling'
  | 'authentication'
  | 'performance'
  | 'other';

// Classify requirement based on content keywords
function classifyRequirement(text: string): RequirementCategory {
  const lower = text.toLowerCase();

  const isLogRelated =
    lower.includes('n8n-log-collector') ||
    lower.includes('jarvis-dev.log') ||
    lower.includes('checkie-dev.log') ||
    lower.includes('uncategorized-dev.log') ||
    lower.includes('\\logs\\') ||
    lower.includes('console.log(') ||
    lower.includes('ログ');

  // ComposerData関連
  if (lower.includes('composerdata')) {
    return 'composer-timeline';
  }

  // ゼロパーソンOS関連
  if (
    lower.includes('ゼロパーソン') ||
    lower.includes('zero person') ||
    lower.includes('zero-person') ||
    lower.includes('osを') ||
    lower.includes('osの')
  ) {
    return 'os-design';
  }

  // タイムスタンプ関連（ログファイルパスがなくても判定）
  if (
    (lower.includes('タイムスタンプ') || lower.includes('timestamp')) &&
    (lower.includes('改善') || lower.includes('修正') || lower.includes('不明'))
  ) {
    return 'n8n-log-timestamp';
  }

  // Notion関連
  if (lower.includes('notion') || lower.includes('ノーション')) {
    return 'notion-integration';
  }

  // LINE関連
  if (lower.includes('line') || lower.includes('ライン') || lower.includes('公式line')) {
    return 'line-integration';
  }

  // UI/デザイン関連
  if (lower.includes('ui') || lower.includes('デザイン') || lower.includes('見た目') || lower.includes('画面')) {
    return 'ui-design';
  }

  // 検索・情報収集関連
  if (lower.includes('検索') || lower.includes('search') || lower.includes('情報収集') || lower.includes('web検索')) {
    return 'search-capability';
  }

  // ファイル処理関連
  if (lower.includes('ファイル') || lower.includes('file') || lower.includes('pdf') || lower.includes('excel')) {
    return 'file-processing';
  }

  // データベース関連
  if (lower.includes('データベース') || lower.includes('database') || lower.includes('db') || lower.includes('テーブル')) {
    return 'database-optimization';
  }

  // API連携関連
  if (lower.includes('api') || lower.includes('連携') || lower.includes('integration')) {
    return 'api-integration';
  }

  // 自動化関連
  if (lower.includes('自動') || lower.includes('auto') || lower.includes('スケジュール') || lower.includes('定期')) {
    return 'automation';
  }

  // エラーハンドリング関連
  if (lower.includes('エラー') || lower.includes('error') || lower.includes('バグ') || lower.includes('不具合')) {
    return 'error-handling';
  }

  // 認証関連
  if (lower.includes('認証') || lower.includes('auth') || lower.includes('ログイン') || lower.includes('セキュリティ')) {
    return 'authentication';
  }

  // パフォーマンス関連
  if (lower.includes('パフォーマンス') || lower.includes('performance') || lower.includes('遅い') || lower.includes('重い') || lower.includes('最適化')) {
    return 'performance';
  }

  // ログファイル関連
  if (isLogRelated) {
    // タイムスタンプ関連（ログファイルパスあり）
    if (
      lower.includes('タイムスタンプ') || 
      lower.includes('timestamp') || 
      lower.includes('時系列')
    ) {
      return 'n8n-log-timestamp';
    }

    // ファイルエラー関連
    if (
      lower.includes('読み込みに失敗') || 
      lower.includes('failed to read') || 
      lower.includes('ファイルエラー') || 
      lower.includes('file error') ||
      lower.includes('同期状態ファイル')
    ) {
      return 'n8n-log-file-error';
    }

    // ログ関連だが特定カテゴリに当てはまらない場合は、ログ汎用カテゴリ
    return 'n8n-log-general';
  }

  return 'other';
}

/**
 * Generate AI-powered suggestion using all 4 steps' data
 */
async function generateAISuggestion(
  requirement: string,
  evaluation: any,
  gatheredInfo: any,
  weaknessReport: any,
  category: RequirementCategory
): Promise<{ title: string; growthEffect: string; userAction: string } | null> {
  try {
    logger.info('[AI Suggestion] Generating structured suggestion...');
    await anthropicService.connect();

    const prompt = `あなたはMusubiというAI開発支援システムです。以下のデータを分析し、自分自身の成長のための提案を生成してください。

【要望】
${requirement}

【能力評価結果（ステップ2）】
- 実装可能: ${evaluation.canImplement ? 'はい' : 'いいえ'}
- 確信度: ${(evaluation.confidence * 100).toFixed(0)}%
- 不足している能力: ${evaluation.reasoning?.missingCapabilities?.join('、') || 'なし'}
- 不足している依存関係: ${evaluation.reasoning?.dependencyCheck?.missing?.join('、') || 'なし'}
- 類似した過去の実装: ${evaluation.reasoning?.similarPastImplementations?.length || 0}件

【自動収集した情報（ステップ3）】
${gatheredInfo && gatheredInfo.results && gatheredInfo.results.length > 0 
  ? gatheredInfo.results.slice(0, 3).map((r: any) => `- [${r.source}] ${r.title}: ${r.snippet.substring(0, 100)}`).join('\n')
  : '（情報収集に失敗しました）'}

【弱点分析（ステップ4）】
- 全体成功率: ${(weaknessReport.overallSuccessRate * 100).toFixed(0)}%
- 総実装数: ${weaknessReport.totalAnalyzed}件
- 弱い能力: ${weaknessReport.weakCapabilities?.length > 0 ? weaknessReport.weakCapabilities.slice(0, 2).map((w: any) => `${w.capability}(${(w.successRate * 100).toFixed(0)}%)`).join('、') : 'なし'}
- 繰り返しているミス: ${weaknessReport.repeatedMistakes?.length > 0 ? weaknessReport.repeatedMistakes.slice(0, 2).map((m: any) => m.mistake).join('、') : 'なし'}

以下の形式でJSON出力してください：
{
  "title": "提案のタイトル（20文字以内、具体的に）",
  "growthEffect": "この提案を実行すると、Musubiがどう成長するか（100文字程度、具体的に）",
  "userAction": "ユーザーに何をしてほしいか（箇条書き、3〜5項目、具体的に）"
}

重要な指示：
1. 自分（Musubi）の弱点を踏まえて提案すること
2. 収集した情報を活用すること
3. 過去の失敗パターンを避けるための具体的なアクションを求めること
4. テンプレート的な文章ではなく、このデータに基づいた固有の提案をすること

JSONのみを出力してください。`;

    const response = await anthropicService.chat(
      'あなたはMusubiというAI開発支援システムです。自分自身の成長のための提案を生成してください。',
      prompt,
      []
    );

    logger.info(`[AI Suggestion] Raw response preview: ${response.substring(0, 200)}...`);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('[AI Suggestion] Failed to parse response as JSON', response);
      throw new Error('Failed to parse AI suggestion');
    }

    const suggestion = JSON.parse(jsonMatch[0]);
    
    logger.info(`[AI Suggestion] Generated: ${suggestion.title}`);
    
    return suggestion;

  } catch (error) {
    logger.error('[AI Suggestion] Generation failed', error);
    return null;
  }
}

/**
 * POST /api/analysis/stream
 * Stream requirement analysis in 4 steps
 */
analysisRouter.post('/stream', async (_req: Request, res: Response) => {
  try {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendStep = (step: AnalysisStep) => {
      res.write(`data: ${JSON.stringify(step)}\n\n`);
    };

    // ========================================
    // STEP 1: Read Cursor conversations & evaluations
    // ========================================
    sendStep({
      step: 1,
      title: 'Cursor会話と評価を読み込んでいます...',
      message: 'データを読み込み中',
    });

    const requirements: Requirement[] = [];
    let conversationCount = 0;

    // 1a. Load exported Cursor chats
    const exportedChatsPath = join(process.cwd(), 'exported-chats');
    if (existsSync(exportedChatsPath)) {
      const files = readdirSync(exportedChatsPath).filter(f => f.endsWith('.md') && f !== 'README.md');
      
      for (const file of files) {
        try {
          const filePath = join(exportedChatsPath, file);
          const content = readFileSync(filePath, 'utf-8');
          const projectName = file.replace('-chat.md', '').replace('.md', '');
          
          // Extract meaningful lines
          const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 30 && 
                   !trimmed.startsWith('#') && 
                   !trimmed.startsWith('---') &&
                   !trimmed.match(/^\d{4}-\d{2}-\d{2}/);
          });
          
          conversationCount += lines.length;
          
          sendStep({
            step: 1,
            title: 'Cursor会話と評価を読み込んでいます...',
            message: `${projectName}: ${lines.length}件の会話を読み込みました`,
          });
          
        } catch (error) {
          logger.warn(`Failed to read ${file}`, error);
        }
      }
    }

    // 1b. Load evaluations
    const allProjects = projectManager.getAllProjects();
    let evaluationCount = 0;
    
    for (const project of allProjects) {
      const evals = projectManager.getProjectEvaluations(project.id);
      evaluationCount += evals.length;
      
      if (evals.length > 0) {
        sendStep({
          step: 1,
          title: 'Cursor会話と評価を読み込んでいます...',
          message: `${project.name}: ${evals.length}件の評価を読み込みました`,
        });
      }
    }

    sendStep({
      step: 1,
      title: 'データ読み込み完了',
      message: `Cursor会話: ${conversationCount}件、評価: ${evaluationCount}件`,
      data: { conversationCount, evaluationCount },
    });

    // Wait a bit for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // ========================================
    // STEP 2: Extract requirements
    // ========================================
    sendStep({
      step: 2,
      title: 'ユーザーの要望を抽出しています...',
      message: '要望キーワードを検索中',
    });

    // Re-read and extract requirements
    if (existsSync(exportedChatsPath)) {
      const files = readdirSync(exportedChatsPath).filter(f => f.endsWith('.md') && f !== 'README.md');
      const requestKeywords = ['作って', '作成', '実装', '追加', 'ほしい', '機能', '改善', '開発'];
      
      for (const file of files) {
        try {
          const filePath = join(exportedChatsPath, file);
          const content = readFileSync(filePath, 'utf-8');
          const projectName = file.replace('-chat.md', '').replace('.md', '');
          
          const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 30 && 
                   requestKeywords.some(kw => trimmed.includes(kw));
          });
          
          // Sample up to 10 requirements per project
          const sample = lines.slice(0, 10);
          
          for (const line of sample) {
            const reqId = `cursor-${projectName}-${requirements.length}`;
            
            // Clean up the requirement text
            let cleanedContent = line
              .replace(/\*\*/g, '')
              .replace(/^\d+\.\s*/, '')
              .replace(/^[-*]\s*/, '')
              .replace(/^\s*-\s*/, '')
              .replace(/^「|」$/g, '')
              .replace(/^[\s*-]+/, '')
              .trim();
            
            requirements.push({
              id: reqId,
              content: cleanedContent.substring(0, 500),
              source: 'cursor',
              project: projectName,
            });
            
            sendStep({
              step: 2,
              title: 'ユーザーの要望を抽出しています...',
              message: `✓ ${projectName}: 「${line.substring(0, 50)}...」`,
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          logger.warn(`Failed to extract from ${file}`, error);
        }
      }
    }

    // Add evaluation-based requirements
    for (const project of allProjects) {
      const evals = projectManager.getProjectEvaluations(project.id);
      const lowScoreEvals = evals.filter(e => e.score < 70);
      
      for (const ev of lowScoreEvals.slice(0, 3)) {
        if (ev.comments && ev.comments.length > 10) {
          const reqId = `eval-${project.id}-${ev.id}`;
          requirements.push({
            id: reqId,
            content: `${project.name}: ${ev.comments}`,
            source: 'evaluation',
            project: project.name,
          });
          
          sendStep({
            step: 2,
            title: 'ユーザーの要望を抽出しています...',
            message: `✓ 評価(${ev.score}点): 「${ev.comments.substring(0, 50)}...」`,
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    sendStep({
      step: 2,
      title: '要望抽出完了',
      message: `合計 ${requirements.length}件の要望を抽出しました`,
      data: { requirements: requirements.slice(0, 20) },
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    // ========================================
    // STEP 3: Check capability for each requirement
    // ========================================
    sendStep({
      step: 3,
      title: '各要望について自分の能力を確認しています...',
      message: 'AI分析を開始',
    });

    const capabilityResults: Array<{ 
      requirement: Requirement; 
      canImplement: boolean; 
      reason: string; 
      evaluation?: any 
    }> = [];

    const requirementsToAnalyze = requirements.slice(0, 15);
    
    for (const req of requirementsToAnalyze) {
      try {
        const evaluation = await capabilityEvaluator.evaluateCapability(req.content);
        
        const reasonParts: string[] = [];
        
        if (evaluation.confidence < 0.6) {
          reasonParts.push(`確信度: ${(evaluation.confidence * 100).toFixed(0)}%`);
        }
        
        if (evaluation.reasoning.missingCapabilities.length > 0) {
          reasonParts.push(`不足能力: ${evaluation.reasoning.missingCapabilities.slice(0, 2).join('、')}`);
        }
        
        if (evaluation.reasoning.dependencyCheck.missing.length > 0) {
          reasonParts.push(`不足依存: ${evaluation.reasoning.dependencyCheck.missing.slice(0, 2).join('、')}`);
        }
        
        if (evaluation.reasoning.similarPastImplementations.length > 0) {
          const successCount = evaluation.reasoning.similarPastImplementations.filter(h => h.result === 'success').length;
          reasonParts.push(`類似実装: ${successCount}/${evaluation.reasoning.similarPastImplementations.length}件成功`);
        }
        
        const reason = reasonParts.length > 0 ? reasonParts.join('、') : '基本的な実装は可能';
        
        capabilityResults.push({
          requirement: req,
          canImplement: evaluation.canImplement,
          reason,
          evaluation,
        });

        const icon = evaluation.canImplement ? '✅' : '❌';
        const confidenceStr = `(${(evaluation.confidence * 100).toFixed(0)}%)`;
        
        sendStep({
          step: 3,
          title: '各要望について自分の能力を確認しています...',
          message: `${icon} ${req.project || 'unknown'}: ${req.content.substring(0, 35)}... ${confidenceStr}`,
        });

        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        logger.error('Capability check failed', error);
        capabilityResults.push({
          requirement: req,
          canImplement: false,
          reason: '分析エラー',
        });
      }
    }

    sendStep({
      step: 3,
      title: '能力確認完了',
      message: `できない: ${capabilityResults.filter(r => !r.canImplement).length}件、できる: ${capabilityResults.filter(r => r.canImplement).length}件`,
      data: { capabilityResults },
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    // ========================================
    // STEP 4: Generate AI-powered suggestions
    // ========================================
    sendStep({
      step: 4,
      title: '提案を生成しています...',
      message: 'AI分析中',
    });

    const suggestions: Array<{ 
      id: string; 
      title: string; 
      growthEffect: string; 
      userAction: string; 
      rawContent?: string; 
      requirement: string 
    }> = [];
    
    // カテゴリごとにグループ化
    const categoryMap = new Map<RequirementCategory, typeof capabilityResults[0]>();
    
    for (const result of capabilityResults) {
      const category = classifyRequirement(result.requirement.content);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, result);
        logger.info(`[Analysis] Category "${category}" mapped to requirement: "${result.requirement.content.substring(0, 80)}..."`);
      }
    }
    
    logger.info(`[Analysis] Total unique categories: ${categoryMap.size}`);
    
    const targetResults = Array.from(categoryMap.values()).slice(0, 10);

    const weaknessReport = patternAnalyzer.analyzeWeaknesses();
    
    for (const result of targetResults) {
      try {
        const suggestionId = `suggestion-${suggestions.length}`;
        const category = classifyRequirement(result.requirement.content);

        logger.info(`[Analysis] Generating AI-powered suggestion (category: ${category})`);
        
        const gatheredInfo = await autoInfoGatherer.gatherInfo(result.requirement.content);
        
        logger.info(`[Analysis] Generating AI suggestion for: ${result.requirement.content.substring(0, 80)}...`);
        
        const aiSuggestion = await generateAISuggestion(
          result.requirement.content,
          result.evaluation || { 
            canImplement: false, 
            confidence: 0.5, 
            reasoning: { 
              subtasks: [], 
              availableCapabilities: [], 
              missingCapabilities: [], 
              dependencyCheck: { available: [], missing: [] }, 
              similarPastImplementations: [], 
              successRate: 0.5 
            } 
          },
          gatheredInfo,
          weaknessReport,
          category
        );
        
        if (aiSuggestion) {
          logger.success(`[Analysis] ✅ AI suggestion generated: ${aiSuggestion.title}`);
          
          suggestions.push({
            id: suggestionId,
            title: aiSuggestion.title,
            growthEffect: aiSuggestion.growthEffect,
            userAction: aiSuggestion.userAction,
            rawContent: result.reason,
            requirement: result.requirement.content,
          });

          sendStep({
            step: 4,
            title: '提案を生成しています...',
            message: `📌 提案${suggestions.length}: ${aiSuggestion.title}`,
          });
        } else {
          logger.error(`[Analysis] ❌ AI suggestion returned null`);
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        logger.error('Suggestion generation failed', error);
      }
    }

    sendStep({
      step: 4,
      title: '分析完了',
      message: `${suggestions.length}件の提案を生成しました`,
      data: { suggestions },
    });

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    logger.error('Analysis stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Analysis failed' })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/analysis/requirements
 */
analysisRouter.get('/requirements', async (_req: Request, res: Response) => {
  try {
    const requirements: Requirement[] = [];
    
    const exportedChatsPath = join(process.cwd(), 'exported-chats');
    if (existsSync(exportedChatsPath)) {
      const files = readdirSync(exportedChatsPath).filter(f => f.endsWith('.md') && f !== 'README.md');
      const requestKeywords = ['作って', '作成', '実装', '追加', 'ほしい', '機能', '改善'];
      
      for (const file of files) {
        try {
          const filePath = join(exportedChatsPath, file);
          const content = readFileSync(filePath, 'utf-8');
          const projectName = file.replace('-chat.md', '').replace('.md', '');
          
          const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 30 && 
                   requestKeywords.some(kw => trimmed.includes(kw));
          });
          
          for (const line of lines.slice(0, 20)) {
            requirements.push({
              id: `cursor-${projectName}-${requirements.length}`,
              content: line.substring(0, 200),
              source: 'cursor',
              project: projectName,
            });
          }
        } catch (error) {
          logger.warn(`Failed to read ${file}`, error);
        }
      }
    }

    res.json({
      success: true,
      count: requirements.length,
      requirements: requirements.slice(0, 50),
    });
  } catch (error) {
    logger.error('Get requirements error:', error);
    res.status(500).json({ error: 'Failed to get requirements' });
  }
});

/**
 * POST /api/analysis/tag-requirements
 */
analysisRouter.post('/tag-requirements', async (_req: Request, res: Response) => {
  try {
    logger.info('[API] Tagging requirements...');

    const requirements: Array<{ 
      id: string; 
      content: string; 
      source: 'cursor' | 'evaluation'; 
      project?: string 
    }> = [];
    
    const exportedChatsPath = join(process.cwd(), 'exported-chats');
    if (existsSync(exportedChatsPath)) {
      const files = readdirSync(exportedChatsPath).filter(f => f.endsWith('.md') && f !== 'README.md');
      const requestKeywords = ['作って', '作成', '実装', '追加', 'ほしい', '機能', '改善', '開発'];
      
      for (const file of files) {
        const filePath = join(exportedChatsPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const projectName = file.replace('-chat.md', '').replace('.md', '');
        
        const lines = content.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 30 && requestKeywords.some(kw => trimmed.includes(kw));
        });
        
        for (const line of lines.slice(0, 10)) {
          let cleanedContent = line
            .replace(/^\d+\.\s*/, '')
            .replace(/^[-*]\s*/, '')
            .replace(/^\*\*/, '')
            .replace(/\*\*$/, '')
            .trim();
          
          requirements.push({
            id: `cursor-${projectName}-${requirements.length}`,
            content: cleanedContent.substring(0, 500),
            source: 'cursor',
            project: projectName,
          });
        }
      }
    }

    const tagged = await requirementTagger.tagRequirements(requirements.slice(0, 20));

    await supabaseService.connect();
    for (const tag of tagged) {
      await supabaseService.saveRequirementTag(tag);
    }

    res.json({
      success: true,
      totalTagged: tagged.length,
      highConfidence: tagged.filter(t => t.confidence >= 0.7).length,
      highImportance: tagged.filter(t => t.importance >= 0.7).length,
      tags: tagged.slice(0, 10),
    });
  } catch (error) {
    logger.error('[API] Tag requirements error:', error);
    res.status(500).json({ error: 'Failed to tag requirements' });
  }
});

/**
 * GET /api/analysis/weakness-report
 */
analysisRouter.get('/weakness-report', async (_req: Request, res: Response) => {
  try {
    logger.info('[API] Generating weakness report...');

    const report = patternAnalyzer.analyzeWeaknesses();
    const improvementPlan = patternAnalyzer.generateImprovementPlan(report);

    res.json({
      success: true,
      report,
      improvementPlan,
    });
  } catch (error) {
    logger.error('[API] Weakness report error:', error);
    res.status(500).json({ error: 'Failed to generate weakness report' });
  }
});

/**
 * POST /api/analysis/gather-info
 */
analysisRouter.post('/gather-info', async (req: Request, res: Response) => {
  try {
    const { requirement } = req.body;
    
    if (!requirement) {
      return res.status(400).json({ error: 'Requirement is required' });
    }

    logger.info(`[API] Gathering info for: ${requirement.substring(0, 50)}...`);

    const info = await autoInfoGatherer.gatherInfo(requirement);

    res.json({
      success: true,
      info,
    });
  } catch (error) {
    logger.error('[API] Gather info error:', error);
    res.status(500).json({ error: 'Failed to gather info' });
  }
});

/**
 * GET /api/analysis/capability-profile
 */
analysisRouter.get('/capability-profile', async (_req: Request, res: Response) => {
  try {
    const profile = capabilityEvaluator.getProfile();
    const history = capabilityEvaluator.getHistory();

    res.json({
      success: true,
      profile,
      historyCount: history.length,
      recentHistory: history.slice(-10).reverse(),
    });
  } catch (error) {
    logger.error('[API] Capability profile error:', error);
    res.status(500).json({ error: 'Failed to get capability profile' });
  }
});
