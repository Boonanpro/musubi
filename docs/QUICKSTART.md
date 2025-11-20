# Musubi クイックスタート

## 🚀 5分でスタート

### Step 1: 依存関係のインストール（完了済み✅）

```bash
npm install
```

### Step 2: 環境設定

`.env`ファイルを編集（最低限の設定で動作可能）:

```env
# 最小構成（キーワードベース分類のみ）
# Chekiパスは自動検出されます

# オプション: AI分類を使用する場合
ANTHROPIC_API_KEY=your_api_key_here
```

### Step 3: 実行

```bash
npm run dev
```

## 📋 実行前チェックリスト

- [ ] Chekiが稼働している（D:/n8n-log-collector または C:/Users/emoto/n8n-log-collector）
- [ ] uncategorized-dev.logにデータがある
- [ ] （オプション）Anthropic API Keyを設定した

## 🎯 期待される動作

### 正常動作時

```
🌟 Musubi - Autonomous AI Developer System
Starting up...

Testing Connections
✅ Anthropic connected successfully

Phase 1: Uncategorized Log Classification
Reading uncategorized logs...
✅ Found 1159 uncategorized conversations

Hybrid Classification
Step 1: Keyword-based classification
High confidence: 850, Low confidence: 309
Step 2: AI classification for low confidence cases
Progress: 309/309 (100%)

Generating Report
📊 Total Processed: 1159
✅ Classified: 1050 (90.59%)
❓ Unclassified: 109 (9.41%)
📈 Average Confidence: 78.45%

🎉 Phase 1 Complete
```

### 最小構成（APIキーなし）時

```
🌟 Musubi - Autonomous AI Developer System
⚠️  Anthropic API key not configured, skipping AI classification

Phase 1: Uncategorized Log Classification
✅ Found 1159 uncategorized conversations
Classification method: Keyword-based only
Progress: 1159/1159 (100%)

📊 Total Processed: 1159
✅ Classified: 650 (56.09%)
⚠️  Needs Improvement (AI classification recommended)
```

## 📁 出力ファイル

実行後、`reports/`ディレクトリに以下が生成されます:

- `classification-report-[timestamp].json` - 詳細なJSON形式のレポート
- `classification-report-[timestamp].txt` - 人間が読みやすいテキストレポート
- `classification-results-[timestamp].csv` - 全結果のCSV（Excelで開ける）

## ⚙️ カスタマイズ

### プロジェクトキーワードの追加

`src/config/index.ts`を編集:

```typescript
projects: [
  {
    name: 'jarvis',
    logFile: 'jarvis/jarvis-dev.log',
    keywords: [
      'jarvis', 'ジャーヴィス', 'assistant',
      // 新しいキーワードを追加
      'your-new-keyword',
    ],
  },
  // ...
]
```

### 信頼度の閾値調整

`src/index.ts`の以下の行を変更:

```typescript
// デフォルト: 0.6 (60%)
results = await classifier.classifyHybrid(uncategorizedLogs, 0.6);

// より厳密に: 0.8
results = await classifier.classifyHybrid(uncategorizedLogs, 0.8);

// より緩く: 0.4
results = await classifier.classifyHybrid(uncategorizedLogs, 0.4);
```

## 🐛 トラブルシューティング

### "Cheki directory not found"

**原因**: Chekiのパスが見つからない

**解決策**: `.env`で手動指定
```env
CHEKI_PATH=D:/n8n-log-collector
```

### "No uncategorized logs found"

**原因**: ログファイルが存在しないか空

**確認**: 
```bash
# PowerShellで確認
dir D:\n8n-log-collector\logs\uncategorized\
```

### API Rate Limit エラー

**原因**: Anthropic APIのレート制限

**解決策**: `src/integrations/anthropic.ts`の待機時間を増やす:
```typescript
// デフォルト: 1000ms
await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒に変更
```

## 📊 結果の読み方

### CSV出力の見方

Excelで`classification-results-*.csv`を開くと:

| Conversation ID | Original Project | Predicted Project | Confidence | Reason |
|----------------|------------------|-------------------|-----------|---------|
| 123-abc | uncategorized | jarvis | 0.85 | Matched keywords: jarvis, assistant |
| 456-def | uncategorized | musubi | 0.92 | AI分析による高信頼度の分類 |

### 成功基準

✅ **Good**: 
- Accuracy ≥ 90%
- Error Rate ≤ 5%
- Average Confidence ≥ 70%

⚠️ **Needs Improvement**:
- Accuracy < 90%
- 多数のlow confidenceケース
- → キーワードを追加するか、AI分類を有効化

## 🔄 次のステップ

### 1. 結果の確認と調整
```bash
# レポート確認
cat reports/classification-report-*.txt

# CSV確認（Excelで開く）
start reports/classification-results-*.csv
```

### 2. 精度向上
- キーワードを追加
- AI分類を有効化
- 信頼度閾値を調整

### 3. 再実行
```bash
npm run dev
```

### 4. Notion連携（オプション）
`.env`にNotion設定を追加すると、レポートが自動的にNotionデータベースに保存されます。

## 🎓 学習リソース

- **詳細セットアップ**: `docs/SETUP.md`
- **アーキテクチャ**: `docs/ARCHITECTURE.md`
- **メインREADME**: `README.md`

## 💡 Tips

### バッチ処理の最適化

大量のログ（1000件以上）を処理する場合:

```typescript
// src/integrations/anthropic.ts
async batchClassify(
  conversations: Array<{ id: string; content: string }>,
  projectOptions: string[],
  batchSize: number = 5 // デフォルトの10から5に減らす
)
```

### デバッグモード

詳細なログを見たい場合:

```typescript
// src/index.ts の最初に追加
import { logger, LogLevel } from './utils/logger.js';
logger.setLevel(LogLevel.DEBUG);
```

---

問題が発生した場合や質問がある場合は、遠慮なく相談してください！🌟

