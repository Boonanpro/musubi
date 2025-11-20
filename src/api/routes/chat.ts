/**
 * Musubi - Chat API Routes
 */

import { Router } from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { anthropicService } from '../../integrations/anthropic.js';
import { logger } from '../../utils/logger.js';
import { readUncategorizedLogs } from '../../utils/fileReader.js';
import { appConfig } from '../../config/index.js';
import { codeGenerator } from '../../services/codeGenerator.js';
import { actionManager } from '../../services/actionManager.js';
import { evaluationManager } from '../../services/evaluationManager.js';
import { selfImprovementService } from '../../services/selfImprovement.js';
import { projectManager } from '../../services/projectManager.js';
import { supabaseService } from '../../integrations/supabase.js';

export const chatRouter = Router();

/**
 * POST /api/chat
 * Send a message to Musubi
 */
chatRouter.post('/', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Received chat message: ${message.substring(0, 50)}...`);

    // Try to use Anthropic API first
    const hasAnthropicKey = appConfig.anthropic.apiKey && appConfig.anthropic.apiKey.length > 0;
    logger.info(`[Musubi] Anthropic API key available: ${hasAnthropicKey}`);
    
    let response: string;
    
    if (hasAnthropicKey) {
      try {
        await anthropicService.connect();
        
        // Check if user is requesting self-improvement (CHECK THIS FIRST!)
        const needsSelfImprovement = /自己改善|自己診断|自分を修正|自分を直|自分で直|自分のコード|自分の問題/.test(message) ||
                                      (/直して|修正して|改善して/.test(message) && /自分|ムスビ|Musubi/.test(message));
        
        // Check if user is requesting code generation/implementation
        const needsCodeGeneration = !needsSelfImprovement && /作って|実装して|書いて|追加して|コードを|機能を|ファイルを/.test(message);
        
        // Check if user is asking about evaluation/analysis
        const needsEvaluationAnalysis = /評価|分析結果|データ品質|改善提案|相関|推奨/.test(message);
        
        // Check if user is asking about data/analysis
        const needsDataAnalysis = /データ|状況|品質|精度|ログ|問題|改善|成長|足りない|必要/.test(message) && !needsEvaluationAnalysis;
        
        // Build data context - ALWAYS include project evaluations
        let dataContext = '\n\n';
        
        // Get ALL projects with evaluations
        const allProjects = projectManager.getAllProjects();
        const projectsWithEvals = allProjects.map(p => {
          const evals = projectManager.getProjectEvaluations(p.id);
          if (evals.length === 0) return null;
          
          const avgScore = Math.round(evals.reduce((sum, e) => sum + e.score, 0) / evals.length);
          const recentComments = evals.slice(-3).map(e => e.comments).filter(c => c).join('、');
          
          return {
            name: p.name,
            avgScore,
            evalCount: evals.length,
            recentComments: recentComments || 'なし'
          };
        }).filter(p => p !== null);
        
        if (projectsWithEvals.length > 0) {
          const projectDetails = projectsWithEvals.map(p => 
            `「${p.name}」(${p.evalCount}件評価、平均${p.avgScore}点、最近の意見:${p.recentComments})`
          ).join('、');
          
          dataContext += `あなたが作ったもの: ${projectDetails}`;
          logger.info(`[Musubi] Projects with evaluations: ${projectsWithEvals.length}`);
        } else {
          dataContext += 'あなたが作ったもの: なし（評価データがありません）';
        }
        
        // Fetch Cursor conversations from exported chats or Supabase
        if (needsDataAnalysis) {
          try {
            const exportedChatsPath = join(process.cwd(), 'exported-chats');
            let cursorConversations: Array<{ content: string; project?: string }> = [];
            
            // 1. Try to load from exported chats first
            if (existsSync(exportedChatsPath)) {
              const files = readdirSync(exportedChatsPath).filter(f => f.endsWith('.md'));
              
              if (files.length > 0) {
                logger.info(`📂 Loading ${files.length} exported chat file(s)...`);
                
                for (const file of files) {
                  try {
                    const filePath = join(exportedChatsPath, file);
                    const content = readFileSync(filePath, 'utf-8');
                    const projectName = file.replace('-chat.md', '').replace('.md', '');
                    
                    // Extract meaningful sentences (skip headers, timestamps)
                    const lines = content.split('\n').filter(line => {
                      const trimmed = line.trim();
                      return trimmed.length > 20 && 
                             !trimmed.startsWith('#') && 
                             !trimmed.startsWith('---') &&
                             !trimmed.match(/^\d{4}-\d{2}-\d{2}/); // Skip timestamps
                    });
                    
                    cursorConversations = cursorConversations.concat(
                      lines.map(line => ({ content: line, project: projectName }))
                    );
                    
                    logger.info(`✅ Loaded ${projectName}: ${lines.length} conversations`);
                  } catch (error) {
                    logger.warn(`Failed to read ${file}`, error);
                  }
                }
              }
            }
            
            // 2. Fallback to Supabase if no exported chats
            if (cursorConversations.length === 0) {
              logger.info('No exported chats found, trying Supabase...');
              
              const hasSupabaseKey = appConfig.supabase.url && appConfig.supabase.key;
              if (hasSupabaseKey) {
                await supabaseService.connect();
                const conversations = await supabaseService.fetchConversations({ limit: 50 });
                cursorConversations = conversations.map(c => {
                  const data = c.conversation_data;
                  const content = typeof data === 'string' ? data : (data?.content || data?.message || JSON.stringify(data));
                  return { content, project: c.project_name };
                });
                logger.info(`Fetched ${cursorConversations.length} from Supabase`);
              }
            }
            
            // 3. Build context
            if (cursorConversations.length > 0) {
              // Extract requests/requirements
              const requestKeywords = ['作って', '実装', '追加', 'ほしい', '機能', '改善'];
              const requests = cursorConversations.filter(c => 
                requestKeywords.some(kw => c.content.includes(kw))
              );
              
              dataContext += `

Cursor会話履歴: ${cursorConversations.length}件（要望含む会話: ${requests.length}件）
最近の要望例: ${requests.slice(0, 5).map(r => {
                const preview = r.content.length > 60 ? r.content.substring(0, 60) + '...' : r.content;
                return `「${preview}」`;
              }).join('、') || 'なし'}`;
              
              logger.success(`Cursor conversations loaded: ${cursorConversations.length} total, ${requests.length} requests`);
            } else {
              dataContext += `

Cursor会話履歴: データなし（exported-chatsフォルダにファイルを配置するか、Supabaseを接続してください）`;
            }
          } catch (error) {
            logger.error('Failed to fetch Cursor conversations', error);
          }
        }
        
        // Handle evaluation analysis requests
        if (needsEvaluationAnalysis) {
          try {
            logger.info('Evaluation analysis request detected...');
            
            const analysis = evaluationManager.getAnalysis();
            const allEvaluations = evaluationManager.getAllEvaluations();
            
            // 実際の評価データの詳細
            const evaluationDetails = allEvaluations.map((e, i) => `
評価${i + 1}: ${e.score}点
コンポーネント: ${e.componentName}
コメント: ${e.feedback.comments || 'なし'}
`).join('\n');
            
            dataContext += `

評価データ:
- 総評価${analysis.stats.totalEvaluations}件、平均${Math.round(analysis.stats.averageScore)}点
- 高評価${analysis.stats.highScoreCount}件、中評価${analysis.stats.mediumScoreCount}件、低評価${analysis.stats.lowScoreCount}件
${evaluationDetails}
`;
            
            logger.success('Evaluation analysis completed');
          } catch (error) {
            logger.error('Failed to analyze evaluations', error);
          }
        }
        
        // Handle self-improvement requests
        if (needsSelfImprovement) {
          try {
            logger.info('Self-improvement request detected...');
            
            // Get evaluation data for context
            const allEvaluations = evaluationManager.getAllEvaluations();
            const recentEvaluations = allEvaluations.slice(-5); // Last 5 evaluations
            
            const evaluationContext = recentEvaluations.map((e, i) => `
評価${i + 1}: ${e.score}点
コンポーネント: ${e.componentName}
コメント: ${e.feedback.comments || 'なし'}
`).join('\n');
            
            const result = await selfImprovementService.analyzeProblem(
              message,
              evaluationContext
            );
            
            // Add actions to manager
            result.actions.forEach(action => actionManager.addAction(action));
            
            // Return response with analysis and actions
            response = `承知しました。自己診断を実行します。

${result.analysis}

以下のアクション(${result.actions.length}件)を生成しました：

${result.actions.map((a, i) => {
  const details: any = a.details;
  const path = details?.path || '不明';
  return `${i + 1}. **${a.description}**
   - ファイル: ${path}
   - ステータス: ${a.status === 'pending' ? '承認待ち' : a.status}`;
}).join('\n\n')}

これらの修正を実行してよろしいですか？
承認されたら自分自身を改善します。`;

            logger.success(`Generated ${result.actions.length} self-improvement actions`);
            
            // Return early with actions
            return res.json({
              message: response,
              timestamp: new Date().toISOString(),
              usingAI: true,
              actions: result.actions.map(a => ({
                id: a.id,
                type: a.type,
                description: a.description,
                status: a.status,
              })),
            });
            
          } catch (error) {
            logger.error('Self-improvement failed', error);
            
            // Return error message
            return res.json({
              message: `申し訳ありません。自己改善分析中にエラーが発生しました。\n\nエラー: ${error instanceof Error ? error.message : String(error)}\n\n別の表現で依頼してください。`,
              timestamp: new Date().toISOString(),
              usingAI: true,
              error: true,
            });
          }
        }
        
        // Handle code generation requests
        if (needsCodeGeneration) {
          try {
            logger.info('Code generation request detected...');
            
            const actions = await codeGenerator.generateCode(
              message,
              dataContext,
              conversationHistory
            );
            
            // Add actions to manager
            actions.forEach(action => actionManager.addAction(action));
            
            // Extract component name from first file action
            let componentName: string | undefined;
            let componentPath: string | undefined;
            
            for (const action of actions) {
              if (action.type === 'file_create' || action.type === 'file_edit') {
                const details: any = action.details;
                const path = details?.path;
                
                if (path && typeof path === 'string' && path.includes('src/components/') && (path.endsWith('.tsx') || path.endsWith('.jsx'))) {
                  componentPath = path;
                  componentName = path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '');
                  break;
                }
              }
            }
            
            // Return response with actions
            response = `承知しました。実装します。

以下のアクション(${actions.length}件)を生成しました：

${actions.map((a, i) => `${i + 1}. **${a.description}**
   - タイプ: ${a.type}
   - ステータス: ${a.status === 'pending' ? '承認待ち' : a.status}`).join('\n\n')}

これらのアクションを実行してよろしいですか？
承認されたら実際にファイルを作成/編集します。`;

            logger.success(`Generated ${actions.length} actions${componentName ? ` (Component: ${componentName})` : ''}`);
            
            // Return early with actions
            return res.json({
              message: response,
              timestamp: new Date().toISOString(),
              usingAI: true,
              actions: actions.map(a => ({
                id: a.id,
                type: a.type,
                description: a.description,
                status: a.status,
              })),
              componentName,
              componentPath,
            });
            
          } catch (error) {
            logger.error('Code generation failed', error);
            
            // Return error message instead of silently falling back
            return res.json({
              message: `申し訳ありません。コード生成中にエラーが発生しました。\n\nエラー: ${error instanceof Error ? error.message : String(error)}\n\nもう一度試すか、別の表現で依頼してください。`,
              timestamp: new Date().toISOString(),
              usingAI: true,
              error: true,
            });
          }
        }
        
        // Build system prompt with current context
        logger.info(`[DEBUG] Building system prompt with dataContext length: ${dataContext.length}`);
        logger.info(`[DEBUG] dataContext preview: ${dataContext.substring(0, 200)}`);
        
        const systemPrompt = `あなたはMusubiです。AIソフトウェア開発者として、ユーザーが求める高品質なアウトプットを1発で出せるようになるのが目標。

現在のあなたのデータ:${dataContext}

あなたに与えられているデータは2つだけ：
1. Cursor会話履歴：ユーザーの要望、修正指示、期待値が含まれる（Whatとクオリティ基準）
2. あなたが作ったものへの評価：実際の成果物への具体的なフィードバック（Gap分析）

質問に答える時：
- 「あなたが作ったもの」の評価を見て、何が足りなかったか分析
- 「Cursor会話」でユーザーが要求した機能・修正を思い出す
- その品質を1発で実現するために、何が必要か具体的に要求

回答形式（400字以内）:
「私は【プロジェクト名】を作りましたが【点数】点でした。【具体的な問題】ができませんでした。例えば【具体例】です。ユーザーはCursorで【要求内容】と指示していましたが実現できませんでした。理由は【原因】です。だから【具体的な要求：データ/ツール/API/手本/能力】をください。そうすれば次は1発で高品質なものが作れます」

禁止: 見出し・箇条書き・コードブロック・統計の羅列のみ`;

        // Use Claude to generate response
        logger.info('[Musubi] Sending request to Claude API...');
        logger.info(`[Musubi] System prompt length: ${systemPrompt.length} chars`);
        logger.info(`[Musubi] Message: "${message.substring(0, 100)}..."`);
        
        response = await anthropicService.chat(
          systemPrompt,
          message,
          conversationHistory
        );
        
        logger.success('[Musubi] Claude API response received');
      } catch (error) {
        logger.error('[Musubi] Claude API FAILED:', error);
        logger.error(`[Musubi] Error details: ${error instanceof Error ? error.message : String(error)}`);
        response = await generateResponse(message);
      }
    } else {
      logger.info('No Anthropic API key, using rule-based response');
      response = await generateResponse(message);
    }

    res.json({
      message: response,
      timestamp: new Date().toISOString(),
      usingAI: hasAnthropicKey,
    });
  } catch (error) {
    logger.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate response (fallback when AI is not available)
 */
async function generateResponse(message: string): Promise<string> {
  // Get evaluation data
  const allProjects = projectManager.getAllProjects();
  const miyazaki = allProjects.find(p => p.id === 'miyazaki');
  
  if (miyazaki) {
    const evals = projectManager.getProjectEvaluations('miyazaki');
    if (evals.length > 0) {
      const avgScore = Math.round(evals.reduce((sum, e) => sum + e.score, 0) / evals.length);
      return `私は「${miyazaki.name}」を作りましたが${avgScore}点でした。評価数は${evals.length}件です。しかし、Claude APIが利用できないため、詳細な分析ができません。Anthropic APIキーを設定してください。`;
    }
  }
  
  return `申し訳ありません。Claude APIが利用できないため、データ分析ができません。Anthropic APIキーを設定してください。`;
}

