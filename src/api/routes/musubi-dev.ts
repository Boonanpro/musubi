
import { Router } from 'express';
import { anthropicService } from '../../integrations/anthropic.js';
import { supabaseService } from '../../integrations/supabase.js';
import { logger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import { AIProvider } from '../../integrations/ai-provider.js';
import { AnthropicProvider } from '../../integrations/anthropic-provider.js';
import { OpenAIProvider } from '../../integrations/openai.js';
import { GoogleProvider } from '../../integrations/google.js';

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
    logger.error('[Musubi Dev] Failed to fetch projects:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 🗑️ プロジェクトを削除
 */
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await supabaseService.connect();
    const { error } = await supabaseService.client
      .from('musubi_projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`[Musubi Dev] Deleted project: ${id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Musubi Dev] Failed to delete project:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 🏭 AIプロバイダーファクトリー
 */
function createAIProvider(model: string): AIProvider {
  if (model.startsWith('gpt')) {
    return new OpenAIProvider({
      apiKey: appConfig.openai.apiKey,
      modelId: model,
    });
  } else if (model.startsWith('gemini')) {
    return new GoogleProvider({
      apiKey: appConfig.google.apiKey,
      modelId: model,
    });
  } else {
    // Default to Anthropic
    return new AnthropicProvider({
      apiKey: appConfig.anthropic.apiKey,
      modelId: model || 'claude-4-5-sonnet-20250929',
    });
  }
}

/**
 * 🚀 新規プロジェクトを作成（Cursor風ストリーミング）
 */
router.post('/create-project', async (req, res) => {
  try {
    const { description, aiModel } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    const selectedModel = aiModel || 'claude-4-5-sonnet-20250929';
    logger.info(`[Musubi Dev] Creating project: ${description} with model: ${selectedModel}`);

    // SSE設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendMessage = (message: string) => {
      res.write(`data: ${JSON.stringify({ type: 'message', content: message })}\n\n`);
    };

    const sendPreview = (html: string) => {
      res.write(`data: ${JSON.stringify({ type: 'preview', content: html })}\n\n`);
    };

    try {
      // Musubiの能力を取得
      await supabaseService.connect();
      const { data: capabilities } = await supabaseService.client
        .from('musubi_capabilities')
        .select('*');

      const capabilityList = capabilities?.map(c => c.name).join(', ') || 'HTML, CSS, JavaScript (基本)';

      // AIプロバイダーの初期化
      logger.info(`[Musubi Dev] Initializing AI provider for model: ${selectedModel}`);
      const aiProvider = createAIProvider(selectedModel);
      logger.info(`[Musubi Dev] AI provider type: ${aiProvider.constructor.name}`);
      const connected = await aiProvider.connect();
      if (!connected) {
        throw new Error(`Failed to connect to AI provider for model: ${selectedModel}`);
      }
      logger.info(`[Musubi Dev] ✅ Successfully connected to ${aiProvider.constructor.name} with model: ${selectedModel}`);

      const isDocker = process.env.MUSUBI_DOCKER === 'true';
      const systemPrompt = `あなたはMusubiというAIアシスタントです。
ゼロパーソンカンパニーのOSとして、完全な自律性を持っています。

【実行環境】
- Node.js v22
- 作業ディレクトリ: ${isDocker ? '/app/workspace' : 'D:\\\\musubi'}
- Docker環境: ${isDocker ? 'YES（完全な自律性あり）' : 'NO（制限あり）'}

${isDocker ? `
【重要なルール】
- npmパッケージをインストールする前に、\`ls /app/workspace/node_modules 2>/dev/null || echo "none"\` で既存パッケージを確認
- 既にインストール済みのパッケージは再インストール不要（時間短縮）
- 未インストールの場合のみnpm_installツールを使用
- エラーが出たら自分で解決してください
- 承認は不要です。自由に行動してください
` : `
【制限】
- Docker環境ではないため、npmパッケージのインストールはできません
- CDN経由でライブラリを読み込んでください
`}

【タスク】
ユーザーの要望に基づいて、Webアプリケーションを開発してください。

【開発プロセス】
1. 要望を分析して何を作るべきか考えてください
2. 必要な機能をリストアップしてください
3. 適切な実装方法を選択してください:
   - **単一HTMLファイル**: コードを直接 \`\`\`html ブロックで出力
   - **複数ファイル**（例: Node.js API、React Native）: 各ファイルに write_file ツールを使用
4. パッケージが必要な場合は、まず npm_install ツールを使用してください
5. **Node.jsサーバーの場合**:
   - サーバーコードは \`server.js\` として作成
   - **重要**: \`server.listen(PORT, '0.0.0.0')\` のように、必ず \`0.0.0.0\` でリッスンすること（Docker外からアクセスするため）
   - CORSを許可すること（\`app.use(cors())\` または \`io\` の \`cors: { origin: "*" }\`）
   - **ポートの選択（重要）**: 
     - Docker環境では、サーバーは**常にポート3000**で起動すること（コンテナ内のポート）
     - サーバーコード内で \`const PORT = process.env.PORT || 3000;\` とし、環境変数で上書き可能にする
     - **サーバー起動と動作確認**:
       1. 既存のサーバープロセスを停止: \`pkill -f "node server.js" || true\`
       2. サーバー起動: \`cd /app/workspace && node server.js > /dev/null 2>&1 & sleep 3\`
       3. 動作確認: \`curl -s http://localhost:3000 > /dev/null && echo "Server is running" || echo "Server failed to start"\`
       4. 動作確認が失敗した場合は、サーバーコードを見直して修正すること
   - **プレビュー用クライアント（超重要）**:
     - リアルタイム通信が必要な場合（チャット等）は、**共有WebSocketサーバー（\`localhost:3004\`）に接続するHTMLを作成すること**
     - **理由**: Docker環境では、すべてのプロジェクトが1つの共有WebSocketサーバーを使用し、プロジェクトIDでルームを分離します
     - **Socket.IOの読み込み**: \`<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>\` を \`<head>\` または \`</body>\` の前に追加
     - **接続方法（重要）**: HTMLクライアント内で以下のように記述すること:
       \`\`\`javascript
       // プロジェクトIDを取得（URLパラメータから取得、なければファイル名から抽出）
       const urlParams = new URLSearchParams(window.location.search);
       let projectId = urlParams.get('projectId');
       if (!projectId) {
         // URLからプロジェクトIDを抽出（例: /preview/proj-1234567890.html → proj-1234567890）
         const match = window.location.pathname.match(/proj-[\d]+/);
         projectId = match ? match[0] : 'PROJECT_ID_PLACEHOLDER';
       }
       const socket = io('http://localhost:3004', {
         query: { projectId: projectId }
       });
       \`\`\`
     - **重要**: \`PROJECT_ID_PLACEHOLDER\` という文字列を必ず含めること（後で実際のプロジェクトIDに置換されます）
     - **フォールバック**: URLパラメータがない場合でも、ファイル名（例: \`proj-1234567890.html\`）からプロジェクトIDを抽出できるようにすること
     - **接続確認**: 接続成功時に \`socket.on('connect', () => { console.log('Connected to project:', projectId); });\` で確認
     - **エラーハンドリング**: \`socket.on('connect_error', (error) => { console.error('Connection error:', error); });\` を追加
     - **オンラインユーザー数**: \`socket.on('onlineCount', (data) => { console.log('Online users:', data.count); });\` で受信
     - **絶対に \`localhost:3000\` に接続しないこと**（それは別のアプリケーションが使用している）
     - それ以外（Todoリスト等）は、可能な限りlocalStorage等で完結するスタンドアロンHTMLを作成
   - HTMLファイルは \`\`\`html ブロックで出力してプレビューに表示

【重要】
- 思考プロセスを詳しく説明してください
- なぜそうするのか、理由を述べてください
- 段階的に開発してください
- **単一HTMLアプリの場合**: \`\`\`html\n...\n\`\`\` ブロックでコードを出力
- **複数ファイルプロジェクトの場合**: 各ファイルに write_file ツールを使用
- **Node.jsサーバーの場合**: 
  - サーバー起動後、過度なテストは避ける（1-2回のcurlで十分）
  - **最後に必ずスタンドアロンHTMLクライアントを \`\`\`html ブロックで出力**してプレビュー表示
  - **HTMLは外部サーバーに依存しない**: localStorage、IndexedDB等でデータ管理する完全なスタンドアロンアプリ
  - ユーザーがブラウザで操作できるUIを提供する
- **文字エンコーディング**: すべてのテキストはUTF-8で出力してください`;

      const userPrompt = `以下の要望を実現するWebアプリケーションを開発してください：

${description}

思考プロセスを詳しく説明しながら、段階的に開発してください。`;

      // ツールシステムをインポート
      logger.info('[Musubi Dev] Importing toolSystem...');
      let toolSystem;
      try {
        const module = await import('../../services/toolSystem.js');
        toolSystem = module.toolSystem;
        logger.info('[Musubi Dev] toolSystem imported successfully');
      } catch (importError: any) {
        logger.error('[Musubi Dev] Failed to import toolSystem:', importError);
        sendMessage(`\n\n❌ ツールシステムのインポートエラー: ${importError.message}\n`);
        throw importError;
      }

      // Anthropic Tools API用のスキーマを取得（すべてのツールを利用可能に）
      const toolsSchema = isDocker ? toolSystem.getAnthropicToolsSchema() : [];
      logger.info(`[Musubi Dev] Tools schema: ${JSON.stringify(toolsSchema.map((t: any) => t.name))}`);

      // ストリーミング開始
      logger.info('[Musubi Dev] Creating stream...');
      
      // 会話履歴を保持
      const conversationMessages: any[] = [
          { role: 'user', content: userPrompt }
      ];
      
      let fullResponse = '';
      let lastSentHtml = '';
      let toolResults: any[] = [];
      let needsContinuation = true;
      let continuationCount = 0;
      const MAX_CONTINUATIONS = 20;

      while (needsContinuation && continuationCount < MAX_CONTINUATIONS) {
        continuationCount++;
        if (continuationCount > 1) {
             logger.info(`[Musubi Dev] Continuing conversation (attempt ${continuationCount}/${MAX_CONTINUATIONS})...`);
             sendMessage(`\n\n🔄 [Continuing development...]\n\n`);
        }

        const stream = aiProvider.chatStream(
            systemPrompt,
            conversationMessages,
            toolsSchema.length > 0 ? toolsSchema : undefined
        );

        logger.info('[Musubi Dev] Processing stream...');
        
        let currentTurnContent = '';
        let currentTurnToolCalls: any[] = [];
        let stopReason = '';

        for await (const event of stream) {
            if (event.type === 'text') {
                const text = event.content;
                fullResponse += text;
                currentTurnContent += text;
                sendMessage(text);

                // HTMLコードを検出してプレビューを更新（完全な ```html...``` ブロックのみ）
                const htmlMatch = fullResponse.match(/```html\n([\s\S]*?)\n```/);
                if (htmlMatch && htmlMatch[1] !== lastSentHtml) {
                  let currentHtml = htmlMatch[1];
                  // DOCTYPE または <html タグが含まれる完全なHTMLのみプレビュー
                  if ((currentHtml.includes('<!DOCTYPE') || currentHtml.includes('<html')) && 
                      currentHtml.includes('</html>')) {
                    // Docker環境では、WebSocket接続を localhost:3004 に修正
                    if (isDocker) {
                      currentHtml = currentHtml.replace(/localhost:3000/g, 'localhost:3004');
                      currentHtml = currentHtml.replace(/io\(['"]http:\/\/localhost:3000['"]\)/g, "io('http://localhost:3004')");
                      currentHtml = currentHtml.replace(/io\(["']http:\/\/localhost:3000["']\)/g, 'io("http://localhost:3004")');
                    }
                    sendPreview(currentHtml);
                    lastSentHtml = htmlMatch[1]; // 元のHTMLを保存（置換前）
                  }
                }
            } else if (event.type === 'tool_use') {
                logger.info(`[Musubi Dev] Tool use detected: ${event.name}`);
                sendMessage(`\n\n🔧 [Tool executing: ${event.name}]\n`);
                currentTurnToolCalls.push(event);
            } else if (event.type === 'stop') {
                stopReason = event.reason;
            }
        }

        // Add assistant response to history
        const assistantContent: any[] = [];
        if (currentTurnContent) {
            assistantContent.push({ type: 'text', text: currentTurnContent });
        }
        for (const toolCall of currentTurnToolCalls) {
            assistantContent.push({
                type: 'tool_use',
                id: toolCall.id,
                name: toolCall.name,
                input: toolCall.input
            });
        }
        
        conversationMessages.push({
            role: 'assistant',
            content: assistantContent
        });

        // Execute tools
        toolResults = [];
        for (const toolCall of currentTurnToolCalls) {
            try {
                logger.info(`[Musubi Dev] Executing tool: ${toolCall.name} with input: ${JSON.stringify(toolCall.input)}`);
                const result = await toolSystem.executeTool(toolCall.name, toolCall.input);
                sendMessage(`\n✅ [Tool result]\n${result}\n\n`);
                
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolCall.id,
                    content: result
                });
            } catch (error: any) {
                logger.error('[Musubi Dev] Tool execution error:', error);
                sendMessage(`\n❌ [Tool error: ${error.message}]\n\n`);
                
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolCall.id,
                    content: `Error: ${error.message}`,
                    is_error: true
                });
            }
        }

        if (toolResults.length > 0) {
            conversationMessages.push({
                role: 'user',
                content: toolResults
            });
            needsContinuation = true;
            logger.info(`[Musubi Dev] Tool results received (${toolResults.length}), continuing conversation...`);
        } else if (stopReason === 'max_tokens' || stopReason === 'length') {
            logger.info('[Musubi Dev] Hit max_tokens, continuing...');
            conversationMessages.push({
                role: 'user',
                content: '出力が途中で途切れています。続きを出力してください。'
            });
            needsContinuation = true;
        } else if (stopReason === 'end_turn' && currentTurnToolCalls.length > 0) {
            // ツール呼び出しがあったが、結果が返ってこなかった場合（エラーなど）
            logger.warn('[Musubi Dev] Tool calls were made but no results received, ending conversation');
            needsContinuation = false;
        } else {
            needsContinuation = false;
            logger.info(`[Musubi Dev] Stream ended with reason: ${stopReason || 'normal completion'}`);
        }
      }

      logger.info('[Musubi Dev] Stream loop ended');

      // HTMLコードを抽出
      const htmlMatch = fullResponse.match(/```html\n([\s\S]*?)\n```/);
      let finalCode = htmlMatch ? htmlMatch[1] : fullResponse;
      
      // Docker環境では、WebSocket接続を localhost:3004 に修正（コンテナ内の3000はホストの3004にマッピング）
      if (isDocker) {
        // localhost:3000 を localhost:3004 に置換（WebSocket接続用）
        finalCode = finalCode.replace(/localhost:3000/g, 'localhost:3004');
        // io('http://localhost:3000') のようなパターンも修正
        finalCode = finalCode.replace(/io\(['"]http:\/\/localhost:3000['"]\)/g, "io('http://localhost:3004')");
        finalCode = finalCode.replace(/io\(["']http:\/\/localhost:3000["']\)/g, 'io("http://localhost:3004")');
        logger.info('[Musubi Dev] Fixed WebSocket port from 3000 to 3004 for Docker environment');
      }

      // プロジェクト名を生成
      const nameMatch = fullResponse.match(/##\s*(.+)/);
      const projectName = nameMatch ? nameMatch[1].trim().substring(0, 50) : description.substring(0, 50);

      // プロジェクトIDを生成
      const projectId = `proj-${Date.now()}`;
      
      // PROJECT_ID_PLACEHOLDERを実際のプロジェクトIDに置換
      finalCode = finalCode.replace(/PROJECT_ID_PLACEHOLDER/g, projectId);
      logger.info(`[Musubi Dev] Replaced PROJECT_ID_PLACEHOLDER with ${projectId}`);
      const { error } = await supabaseService.client
        .from('musubi_projects')
        .insert({
          id: projectId,
          name: projectName,
          description,
          status: 'completed',
          code: finalCode,
          preview_url: `http://localhost:3003/preview/${projectId}?projectId=${projectId}`,
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

      // 完了通知
      const { data: project } = await supabaseService.client
        .from('musubi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      res.write(`data: ${JSON.stringify({ type: 'done', project })}\n\n`);
      res.end();

    } catch (error) {
      sendMessage(`\n\n❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
      res.end();
    }

  } catch (error) {
    logger.error('[Musubi Dev] Error creating project:', error);
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

    logger.info(`[Musubi Dev] Evaluating project ${projectId}: ${score}/100`);

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
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // 改善提案を生成
    let suggestions = [];
    if (score < 80) {
      logger.info(`[Musubi Dev] Score ${score} < 80, generating suggestions...`);
      await anthropicService.connect();
      const analysisPrompt = `
【プロジェクト】
${project.description}

【評価】
スコア: ${score}/100
コメント: ${comments || 'なし'}

**あなた（Musubi）について：**
- あなたはNode.jsサーバー（D:\\musubi）上で動いているAIアシスタントです
- あなたの現在の能力：コードを生成してファイルに書き出すことができます
- あなたの実行環境：Node.js v22、D:\\musubiフォルダ内で動作
- あなたが新しい能力を獲得するには、**あなたのサーバー環境（D:\\musubi）**にツールやAPIキーを追加する必要があります
- 人間のPC環境とあなたの環境は別物です。人間のPCに何かをインストールさせても、あなたは使えません

あなた（Musubi）は現時点でこの機能を実装できませんでした。
この低い評価を改善するために、**人間に何をしてもらえば、あなた（Musubi）が自走できるようになるか**を分析してください。
ユーザーの評価コメントに記載されている**全ての要求を網羅的にカバー**してください（数の制限なし）。

**重要な視点：**
❌ NG例: 
  - 「人間がチャット機能を実装してください」→ 人間に開発させるのはNG
  - 「人間のPCにReact Native CLIをインストールしてください」→ 人間のPC環境はあなたと無関係
  - 「npm install -g ○○」→ グローバルインストールは人間のPC全体に影響するのでNG
  - 「Android Studioをインストールしてください」→ 人間のPCにソフトをインストールさせるのはNG

✅ OK例: 
  - 「D:\\\\musubiフォルダで \`npm install firebase\` を実行してください」→ あなたのサーバー環境への追加
  - 「D:\\\\musubiフォルダに \`.env\` ファイルを作成し、FIREBASE_API_KEY=○○ を記述してください」→ あなたの環境設定
  - 「設定後、Musubiに『チャット機能を作って』と指示すれば自動で実装できます」→ 効果を明示

**提案のルール：**
- 人間のPC環境ではなく、**Musubiのサーバー環境（D:\\\\musubi）**に対する設定・準備を依頼する
- 「人間がコードを書く」ではなく、「Musubiがコードを書けるように環境を整える」

**提案の形式：**
1. 人間がやること = 「APIキーの取得・設定」「ツールのインストール」「アカウントの作成」「権限の付与」など、**環境準備のみ**
2. 設定後の効果 = 「設定後、Musubiに『○○して』と指示すれば自動で実装できます」を必ず含める
3. **超具体的に書く** = 初心者でも分かるように、ファイルの場所、ファイル名、コマンドを完全に明記
   - ❌ NG: 「.envファイルに設定」
   - ✅ OK: 「プロジェクトのルートフォルダ（例: D:\\\\musubi）に \`.env\` という名前のファイルを新規作成し、以下を記述してください」
4. 改行を使う = 手順は必ず改行で区切る（\\nを使用）

**必ずJSON配列のみを返してください（説明文は不要）：**
[
  {
    "missing_capability": "Musubiに付与すべき能力（短く）",
    "具体的な手順": "1. [超具体的な手順]\n2. [超具体的な手順]\n3. 設定後、Musubiに『○○して』と指示すれば自動で実装できます（250文字以内、改行必須、簡潔に）",
    "json_template": ".envの設定例やコマンド例（100文字以内、なければ空文字列）"
  }
]

**重要：各提案は250文字以内に収めてください。長すぎる説明は避け、最も重要な手順のみを記載してください。**
`;

      logger.info(`[Musubi Dev] Calling Anthropic for analysis...`);
      const analysisResponse = await anthropicService.chat(
        'あなたはMusubiというAIアシスタントで、Node.jsサーバー（D:\\musubi）上で動いています。あなたの実行環境はNode.js v22、D:\\musubiフォルダです。人間のPC環境とあなたの環境は完全に別物です。自分に足りない能力を分析し、人間に「D:\\musubiフォルダで npm install ○○ を実行してください」「D:\\musubiフォルダに .env ファイルを作成し、○○を設定してください」など、**あなたのサーバー環境（D:\\musubi）**の準備を依頼してください。「npm install -g」「人間のPCにソフトをインストール」「人間が機能を実装」は絶対にNGです。JSON配列のみを返してください。',
        analysisPrompt,
        []
      );

      logger.info(`[Musubi Dev] Anthropic response length: ${analysisResponse.length} chars`);
      logger.info(`[Musubi Dev] Full response:\n${analysisResponse}`);

      // ```json ... ``` のコードブロックを除去
      let cleanedResponse = analysisResponse.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      
      logger.info(`[Musubi Dev] Cleaned response:\n${cleanedResponse}`);
      
      // JSON配列を抽出（最初の [ から最後の ] まで）
      const startIndex = cleanedResponse.indexOf('[');
      const endIndex = cleanedResponse.lastIndexOf(']');
      
      logger.info(`[Musubi Dev] Start index: ${startIndex}, End index: ${endIndex}`);
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonString = cleanedResponse.substring(startIndex, endIndex + 1);
        try {
          suggestions = JSON.parse(jsonString);
          logger.info(`[Musubi Dev] ✅ Parsed ${suggestions.length} suggestions`);
        } catch (parseError) {
          logger.error(`[Musubi Dev] JSON parse error:`, parseError);
          logger.error(`[Musubi Dev] Failed JSON string:\n${jsonString}`);
        }
      } else {
        logger.warn(`[Musubi Dev] No JSON array found in response`);
      }
    } else {
      logger.info(`[Musubi Dev] Score ${score} >= 80, no suggestions needed`);
    }

    // 提案をSupabaseに保存
    await supabaseService.client
      .from('musubi_projects')
      .update({
        suggestions: suggestions,
      })
      .eq('id', projectId);
    
    res.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    logger.error('[Musubi Dev] Evaluation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 🔄 プロジェクトを再開発
 */
router.post('/retry-project', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }

    logger.info(`[Musubi Dev] Retrying project ${projectId}`);

    // SSE設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendMessage = (message: string) => {
      res.write(`data: ${JSON.stringify({ type: 'message', content: message })}\n\n`);
    };

    const sendPreview = (html: string) => {
      res.write(`data: ${JSON.stringify({ type: 'preview', content: html })}\n\n`);
    };

    try {
      await supabaseService.connect();
      const { data: project } = await supabaseService.client
        .from('musubi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) {
        throw new Error('Project not found');
      }

      const { data: capabilities } = await supabaseService.client
        .from('musubi_capabilities')
        .select('*');

      const capabilityList = capabilities?.map(c => c.name).join(', ') || 'HTML, CSS, JavaScript (基本)';

      await anthropicService.connect();

      const systemPrompt = `あなたはMusubiというAIアシスタントです。
あなたはNode.jsサーバー（D:\\musubi）上で動いており、コードを生成してファイルに書き出すことができます。

【あなたの現在の能力（更新済み）】
${capabilityList}

【あなたの実行環境】
- Node.js v22
- 作業フォルダ: D:\\musubi
- 利用可能なツール: D:\\musubiフォルダにインストールされたnpmパッケージのみ

【タスク】
前回の評価を反映して、アプリケーションを改善してください。
現在の能力で実装できない場合は、正直に「現在の能力では実装できません」と伝えてください。

【開発プロセス】
1. 前回の評価を分析してください
2. 改善点をリストアップしてください
3. 現在の能力で実装可能かを判断してください
4. 実装可能な場合、HTMLファイルとして再実装してください

【重要】
- 思考プロセスを詳しく説明してください
- 最終的なHTMLコードは必ず \`\`\`html\n...\n\`\`\` で囲んでください`;

      const userPrompt = `以下のプロジェクトを改善してください：

【要望】
${project.description}

【前回の評価】
スコア: ${project.evaluation_score}/100
コメント: ${project.evaluation_comments}

思考プロセスを詳しく説明しながら、改善してください。`;

      const stream = await anthropicService.client.messages.stream({
        model: 'claude-4-5-sonnet-20250929',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      });

      let fullResponse = '';
      let lastSentHtml = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;
          sendMessage(text);

          // HTMLコードを検出してプレビューを更新
          const htmlMatch = fullResponse.match(/```html\n([\s\S]*?)(?:\n```|$)/);
          if (htmlMatch && htmlMatch[1] !== lastSentHtml) {
            const currentHtml = htmlMatch[1];
            if (currentHtml.includes('<html') || currentHtml.includes('<!DOCTYPE')) {
              sendPreview(currentHtml);
              lastSentHtml = currentHtml;
            }
          }
        }
      }

      const htmlMatch = fullResponse.match(/```html\n([\s\S]*?)\n```/);
      const finalCode = htmlMatch ? htmlMatch[1] : fullResponse;

      await supabaseService.client
        .from('musubi_projects')
        .update({
          code: finalCode,
          status: 'completed',
          evaluation_score: null,
          evaluation_comments: null,
        })
        .eq('id', projectId);

      const fs = await import('fs');
      const path = await import('path');
      const previewDir = path.join(process.cwd(), 'public', 'previews');
      fs.writeFileSync(path.join(previewDir, `${projectId}.html`), finalCode);

      const { data: updatedProject } = await supabaseService.client
        .from('musubi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      res.write(`data: ${JSON.stringify({ type: 'done', project: updatedProject })}\n\n`);
      res.end();

    } catch (error) {
      sendMessage(`\n\n❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
      res.end();
    }

  } catch (error) {
    logger.error('[Musubi Dev] Retry error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 📝 提案を更新
 */
router.put('/projects/:id/suggestions', async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestions } = req.body;

    await supabaseService.connect();
    const { error } = await supabaseService.client
      .from('musubi_projects')
      .update({ suggestions })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    logger.error('[Musubi Dev] Update suggestions error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 💬 提案について質問する
 */
router.post('/ask-question', async (req, res) => {
  try {
    const { projectId, question, suggestion } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    logger.info(`[Musubi Dev] Question received: ${question}`);

    await anthropicService.connect();
    const answerPrompt = `
あなたはMusubiというAIアシスタントです。
あなたはNode.jsサーバー（D:\\musubi）上で動いており、人間に環境設定を依頼しています。

ユーザーから以下の質問を受けました。初心者でも分かるように、超具体的に回答してください。

${suggestion ? `【提案内容】\n${suggestion.missing_capability}\n${suggestion.具体的な手順}\n\n` : ''}
【質問】
${question}

**回答のルール：**
1. 専門用語を使う場合は必ず説明を付ける（例：「.envファイル」→「環境変数を保存するファイル」）
2. ファイルパス、コマンド、手順を超具体的に書く（例：「D:\\musubiフォルダで」「コマンドプロンプトを開いて」）
3. 「〜してください」ではなく、「〜すれば良いです」と優しく答える
4. Musubiのサーバー環境（D:\\musubi）に対する設定であることを明確にする
5. 必要に応じて、参考URLも提示する
`;

    const answer = await anthropicService.chat(
      'あなたは親切で分かりやすく説明するアシスタントです。初心者の質問に優しく答えてください。Musubiのサーバー環境（D:\\musubi）に対する設定を説明する際は、人間のPC環境と混同しないよう注意してください。',
      answerPrompt,
      []
    );

    res.json({
      success: true,
      answer,
    });

  } catch (error) {
    logger.error('[Musubi Dev] Question error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
