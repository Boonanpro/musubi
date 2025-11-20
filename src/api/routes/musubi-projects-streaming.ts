import { Router } from 'express';
import { anthropicService } from '../../integrations/anthropic.js';
import { supabaseService } from '../../integrations/supabase.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * 📋 プロジェクト一覧を取得
 */
router.get('/projects', async (_req, res) => {
  try {
    await supabaseService.connect();
    const { data, error } = await supabaseService.client
      .from('musubi_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      projects: data || [],
    });
  } catch (error) {
    logger.error('[Musubi Projects] Failed to fetch projects:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 🚀 新規プロジェクトを作成（ストリーミング）
 */
router.post('/create-project', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    logger.info(`[Musubi Projects] Creating project: ${description}`);

    // SSE（Server-Sent Events）を設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendStep = (step: string, message: string, progress?: number) => {
      res.write(`data: ${JSON.stringify({ step, message, progress })}\n\n`);
    };

    try {
      // ステップ1: 要件分析
      sendStep('analyzing', '📋 要件を分析しています...', 10);
      await new Promise(resolve => setTimeout(resolve, 500));

      await supabaseService.connect();
      const { data: capabilities } = await supabaseService.client
        .from('musubi_capabilities')
        .select('*');

      const capabilityList = capabilities?.map(c => c.name).join(', ') || 'HTML, CSS, JavaScript (基本)';

      // ステップ2: 設計
      sendStep('designing', '🎨 アプリケーションを設計しています...', 30);
      await new Promise(resolve => setTimeout(resolve, 500));

      // ステップ3: 実装
      sendStep('implementing', '⚙️ コードを実装しています...', 50);
      
      await anthropicService.connect();
      const codePrompt = `
あなたはMusubi AI開発者です。以下の要望に基づいてWebアプリケーションを作成してください。

【要望】
${description}

【Musubiの現在の能力】
${capabilityList}

【制約】
- 単一のHTMLファイルで完結させてください
- CSS、JavaScriptはインラインで記述
- 外部ライブラリはCDN経由で読み込む（必要な場合のみ）
- 動作するプロトタイプを作成
- デザインは現代的でユーザーフレンドリーに

【出力形式】
HTMLコードのみを出力してください。説明は不要です。
`;

      const code = await anthropicService.chat(
        'あなたはWeb開発の専門家です。',
        codePrompt,
        []
      );

      // HTMLコードを抽出
      const htmlMatch = code.match(/```html\n([\s\S]*?)\n```/) || code.match(/<html[\s\S]*<\/html>/i);
      const finalCode = htmlMatch ? (htmlMatch[1] || htmlMatch[0]) : code;

      // ステップ4: テスト
      sendStep('testing', '🧪 動作確認をしています...', 70);
      await new Promise(resolve => setTimeout(resolve, 500));

      // プロジェクト名を生成
      const namePrompt = `以下の要望から、簡潔なプロジェクト名（20文字以内、日本語）を生成してください：\n${description}`;
      const nameResponse = await anthropicService.chat('', namePrompt, []);
      const projectName = nameResponse.trim().replace(/['"]/g, '').substring(0, 50);

      // ステップ5: 保存
      sendStep('saving', '💾 プロジェクトを保存しています...', 90);

      const projectId = `proj-${Date.now()}`;
      const { error } = await supabaseService.client
        .from('musubi_projects')
        .insert({
          id: projectId,
          name: projectName,
          description,
          status: 'completed',
          code: finalCode,
          preview_url: `http://localhost:3003/preview/${projectId}`,
        });

      if (error) throw error;

      // プレビューファイルを作成
      const fs = await import('fs');
      const path = await import('path');
      const previewDir = path.join(process.cwd(), 'public', 'previews');
      if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
      }
      fs.writeFileSync(path.join(previewDir, `${projectId}.html`), finalCode);

      // 完了
      sendStep('completed', '✅ プロジェクトが完成しました！', 100);

      // プロジェクト情報を送信
      const { data: project } = await supabaseService.client
        .from('musubi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      res.write(`data: ${JSON.stringify({ step: 'done', project })}\n\n`);
      res.end();

    } catch (error) {
      sendStep('error', `❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`, 0);
      res.end();
    }

  } catch (error) {
    logger.error('[Musubi Projects] Error creating project:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 📊 プロジェクトを評価 → 改善提案を生成
 */
router.post('/evaluate-project', async (req, res) => {
  try {
    const { projectId, score, comments } = req.body;

    if (!projectId || score === undefined) {
      return res.status(400).json({ success: false, error: 'Project ID and score are required' });
    }

    logger.info(`[Musubi Projects] Evaluating project ${projectId}: ${score}/100`);

    // プロジェクトを取得
    await supabaseService.connect();
    const { data: project } = await supabaseService.client
      .from('musubi_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // 評価を保存
    await supabaseService.client
      .from('musubi_projects')
      .update({
        status: 'evaluated',
        evaluation_score: score,
        evaluation_comments: comments,
      })
      .eq('id', projectId);

    // 改善提案を生成（スコアが80未満の場合）
    let suggestions = [];
    if (score < 80) {
      await anthropicService.connect();
      const analysisPrompt = `
あなたはMusubiの能力分析エージェントです。

【プロジェクト】
${project.description}

【評価】
スコア: ${score}/100
コメント: ${comments || 'なし'}

【タスク】
この評価を達成するために、Musubiに何の能力が足りないか分析してください。

【出力形式】
JSON配列で返してください：
[
  {
    "missing_capability": "必要な能力（例: React開発環境）",
    "具体的な手順": "ユーザーが実行すべき具体的な手順を詳細に記述。\n\n例：\n1. Supabaseで新しいテーブルを作成\n2. SQL Editorで以下のSQLを実行\n3. 完了したら「能力を付与」ボタンをクリック",
    "json_template": "実際に貼り付けるコード（あれば）"
  }
]

【重要】
- 「具体的な手順」は、技術に詳しくない人でも実行できるレベルで詳細に
- ファイルパス、コマンド、設定値を具体的に記載
- 曖昧な表現は避ける
- 1つの提案につき1つの能力のみ
`;

      const analysisResponse = await anthropicService.chat(
        'あなたは能力分析の専門家です。',
        analysisPrompt,
        []
      );

      const jsonMatch = analysisResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    }

    res.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    logger.error('[Musubi Projects] Evaluation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 🔄 プロジェクトを再開発（能力付与後）
 */
router.post('/retry-project', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }

    logger.info(`[Musubi Projects] Retrying project ${projectId}`);

    // SSE設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendStep = (step: string, message: string, progress?: number) => {
      res.write(`data: ${JSON.stringify({ step, message, progress })}\n\n`);
    };

    try {
      // プロジェクトを取得
      await supabaseService.connect();
      const { data: project } = await supabaseService.client
        .from('musubi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) {
        throw new Error('Project not found');
      }

      sendStep('analyzing', '📋 前回の評価を分析しています...', 10);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Musubiの現在の能力を取得（更新された能力を含む）
      const { data: capabilities } = await supabaseService.client
        .from('musubi_capabilities')
        .select('*');

      const capabilityList = capabilities?.map(c => c.name).join(', ') || 'HTML, CSS, JavaScript (基本)';

      sendStep('designing', '🎨 改善点を設計しています...', 30);
      await new Promise(resolve => setTimeout(resolve, 500));

      sendStep('implementing', '⚙️ コードを再実装しています...', 50);

      // コード再生成
      await anthropicService.connect();
      const codePrompt = `
あなたはMusubi AI開発者です。以下の要望に基づいてWebアプリケーションを作成してください。

【要望】
${project.description}

【前回の評価】
スコア: ${project.evaluation_score}/100
コメント: ${project.evaluation_comments}

【Musubiの現在の能力（更新済み）】
${capabilityList}

【制約】
- 単一のHTMLファイルで完結させてください
- 前回の評価を反映して改善してください
- 動作するプロトタイプを作成
- デザインは現代的でユーザーフレンドリーに

【出力形式】
HTMLコードのみを出力してください。
`;

      const code = await anthropicService.chat(
        'あなたはWeb開発の専門家です。',
        codePrompt,
        []
      );

      const htmlMatch = code.match(/```html\n([\s\S]*?)\n```/) || code.match(/<html[\s\S]*<\/html>/i);
      const finalCode = htmlMatch ? (htmlMatch[1] || htmlMatch[0]) : code;

      sendStep('testing', '🧪 動作確認をしています...', 70);
      await new Promise(resolve => setTimeout(resolve, 500));

      sendStep('saving', '💾 プロジェクトを保存しています...', 90);

      // 既存プロジェクトを更新
      await supabaseService.client
        .from('musubi_projects')
        .update({
          code: finalCode,
          status: 'completed',
          evaluation_score: null,
          evaluation_comments: null,
        })
        .eq('id', projectId);

      // プレビューファイルを更新
      const fs = await import('fs');
      const path = await import('path');
      const previewDir = path.join(process.cwd(), 'public', 'previews');
      fs.writeFileSync(path.join(previewDir, `${projectId}.html`), finalCode);

      sendStep('completed', '✅ プロジェクトが改善されました！', 100);

      const { data: updatedProject } = await supabaseService.client
        .from('musubi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      res.write(`data: ${JSON.stringify({ step: 'done', project: updatedProject })}\n\n`);
      res.end();

    } catch (error) {
      sendStep('error', `❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`, 0);
      res.end();
    }

  } catch (error) {
    logger.error('[Musubi Projects] Retry error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

