# Musubi n8nワークフロー セットアップ手順

## 📋 前提条件

- n8n有料プラン契約済み
- Supabaseプロジェクト作成済み
- Anthropic API Key取得済み

---

## 🔧 セットアップ手順

### 1. Supabaseテーブル作成

1. Supabaseダッシュボードを開く
2. SQL Editorを開く
3. `supabase-schema.sql`の内容を貼り付けて実行
4. 全テーブルが作成されたことを確認

---

### 2. n8n認証情報の設定

#### 2-1. Supabase認証情報

1. n8nで **Settings > Credentials** を開く
2. **New Credential** をクリック
3. **Supabase** を選択
4. 以下を入力:
   - **Name**: `Supabase - Musubi`
   - **Host**: あなたのSupabase URL（例: `https://xxxxx.supabase.co`）
   - **Service Role Secret**: SupabaseのService Role Key
5. **Save** をクリック

#### 2-2. Anthropic API認証情報

1. n8nで **Settings > Credentials** を開く
2. **New Credential** をクリック
3. **HTTP Header Auth** を選択
4. 以下を入力:
   - **Name**: `Anthropic API`
   - **Name**: `x-api-key`
   - **Value**: あなたのAnthropic API Key（`sk-ant-api...`）
5. **Save** をクリック

---

### 3. ワークフローのインポート

#### 3-1. ワークフロー1: 常時監視・自動分析

1. n8nで **Workflows** を開く
2. **Import from File** をクリック
3. `musubi-continuous-monitoring.json` を選択
4. インポート完了後、ワークフローを開く
5. 以下のノードを編集:

**「Cursor会話ファイルを読み込み」ノード:**
```javascript
// 5行目を編集
const exportedChatsPath = 'D:/musubi/exported-chats'; // ← あなたのパス
```

6. **Save** をクリック
7. **Activate** をクリック（ワークフローを有効化）

#### 3-2. ワークフロー2: 提案生成

1. `musubi-suggestion-generation.json` をインポート
2. インポート完了後、ワークフローを開く
3. **Webhook受信** ノードをクリック
4. **Webhook URL** をコピー（例: `https://your-n8n.app.n8n.cloud/webhook/musubi-suggestion-trigger`）
5. **Save** をクリック
6. **Activate** をクリック

#### 3-3. ワークフロー3: 週次成長レポート

1. `musubi-weekly-growth-report.json` をインポート
2. **Save** をクリック
3. **Activate** をクリック

---

### 4. Express APIの修正

#### 4-1. 内部APIエンドポイントを追加

`src/api/routes/internal.ts` を作成:

```typescript
import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger.js';

export const internalRouter = Router();

/**
 * n8nから呼ばれる: 提案生成トリガー
 */
internalRouter.post('/trigger-suggestion-generation', async (req: Request, res: Response) => {
  try {
    logger.info('[Internal] Suggestion generation triggered by n8n');
    
    // n8nのWebhookを呼び出す
    const n8nWebhookUrl = process.env.N8N_SUGGESTION_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      throw new Error('N8N_SUGGESTION_WEBHOOK_URL not configured');
    }
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'express-api' }),
    });
    
    const result = await response.json();
    
    res.json({
      success: true,
      message: 'Suggestion generation triggered',
      result,
    });
  } catch (error) {
    logger.error('[Internal] Failed to trigger suggestion generation', error);
    res.status(500).json({ error: 'Failed to trigger suggestion generation' });
  }
});

/**
 * n8nから呼ばれる: 成長レポート通知
 */
internalRouter.post('/notify-growth-report', async (req: Request, res: Response) => {
  try {
    const { report_id } = req.body;
    logger.info(`[Internal] Growth report generated: ${report_id}`);
    
    // フロントエンドに通知（WebSocketやSSEで）
    // TODO: 実装
    
    res.json({ success: true });
  } catch (error) {
    logger.error('[Internal] Failed to process growth report notification', error);
    res.status(500).json({ error: 'Failed to process notification' });
  }
});
```

#### 4-2. サーバーに登録

`src/api/server.ts` に追加:

```typescript
import { internalRouter } from './routes/internal.js';

// ... 既存のコード ...

app.use('/api/internal', internalRouter);
```

#### 4-3. 環境変数を設定

`.env` ファイルに追加:

```
N8N_SUGGESTION_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/musubi-suggestion-trigger
```

（手順3-2でコピーしたWebhook URLを貼り付け）

---

### 5. 動作確認

#### 5-1. ワークフロー1のテスト

1. n8nで「常時監視・自動分析」ワークフローを開く
2. **Execute Workflow** をクリック（手動実行）
3. 各ノードが緑色になることを確認
4. Supabaseの `requirements` テーブルにデータが入ることを確認

#### 5-2. ワークフロー2のテスト

1. Postman or curlで以下を実行:
```bash
curl -X POST https://your-n8n.app.n8n.cloud/webhook/musubi-suggestion-trigger \
  -H "Content-Type: application/json" \
  -d '{"source": "test"}'
```
2. n8nで実行履歴を確認
3. Supabaseの `suggestions` テーブルにデータが入ることを確認

#### 5-3. ワークフロー3のテスト

1. n8nで「週次成長レポート」ワークフローを開く
2. **Execute Workflow** をクリック
3. Supabaseの `growth_reports` テーブルにデータが入ることを確認

---

## 🎯 次のステップ

1. **フロントエンドの修正**
   - `/api/analysis/stream` を削除
   - Supabaseから直接提案を取得するように変更

2. **提案のライフサイクル管理**
   - 承認ボタンの実装
   - 承認時にステータスを `approved` に更新
   - 待機中の提案を繰り上げ

3. **成長レポートの表示**
   - 新しいページを作成
   - 週次レポートを表示

---

## ⚠️ トラブルシューティング

### エラー: "Failed to parse AI response"

- AI応答がJSON形式でない
- プロンプトを調整して、必ずJSONのみを出力するように指示

### エラー: "Supabase connection failed"

- 認証情報が正しいか確認
- SupabaseのService Role Keyを使用しているか確認

### エラー: "Anthropic API rate limit"

- API呼び出しが多すぎる
- バッチサイズを小さくする（10件 → 5件）

---

## 📞 サポート

問題が発生した場合は、n8nの実行履歴を確認してください。
各ノードの入出力データが記録されているので、どこで失敗したかすぐにわかります。

