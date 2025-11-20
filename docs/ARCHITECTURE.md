# Musubi アーキテクチャ

## システム概要

Musubiは「自律型AI開発者システム」として設計されており、以下の5つのコア機能を持ちます：

```
┌─────────────────────────────────────────────────────────────┐
│                      Musubi System                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Data Input   │  │   Learning   │  │  Planning    │     │
│  │              │  │              │  │              │     │
│  │ • Supabase   │→ │ • Pattern    │→ │ • Task       │     │
│  │ • Notion     │  │   Analysis   │  │   Selection  │     │
│  │ • Cheki Logs │  │ • Context    │  │ • Priority   │     │
│  └──────────────┘  │   Building   │  │   Setting    │     │
│                     └──────────────┘  └──────────────┘     │
│                             ↓                ↓              │
│                     ┌──────────────┐  ┌──────────────┐    │
│                     │ Execution    │  │ Improvement  │    │
│                     │              │  │              │    │
│                     │ • Code Gen   │→ │ • Self-Eval  │    │
│                     │ • File Ops   │  │ • Config     │    │
│                     │ • Git Ops    │  │   Tuning     │    │
│                     └──────────────┘  └──────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: ログ分類システム

### データフロー

```
Cheki Logs (uncategorized)
          ↓
    File Reader
          ↓
   ┌─────────────┐
   │  Classifier │
   ├─────────────┤
   │  Keywords   │ → Low confidence cases
   └─────────────┘            ↓
          ↓              ┌──────────┐
   High confidence       │ Claude   │
          ↓              │ AI       │
   ┌─────────────┐       └──────────┘
   │   Results   │            ↓
   └─────────────┘       Reclassification
          ↓                   ↓
          └───────────────────┘
                    ↓
              ┌──────────┐
              │ Reporter │
              └──────────┘
                    ↓
        ┌──────────────────────┐
        │ • JSON Report        │
        │ • Text Report        │
        │ • CSV Results        │
        │ • Notion Upload      │
        └──────────────────────┘
```

### コンポーネント

#### 1. Config Management (`src/config/`)
- 環境変数の読み込み
- プロジェクト設定の管理
- パスの自動検出
- 設定のバリデーション

#### 2. Integrations (`src/integrations/`)

**Supabase Service**
- 会話ログの取得
- プロジェクト名の更新
- 統計情報の取得

**Notion Service**
- データベースクエリ
- ページの作成
- レポートのアップロード

**Anthropic Service**
- 会話の分類
- バッチ処理
- レート制限の管理

#### 3. Classifiers (`src/classifiers/`)

**LogClassifier**
- キーワードベース分類
- AIベース分類
- ハイブリッド分類（推奨）

分類戦略:
```typescript
// 1. Fast pass: Keyword matching
if (confidence > threshold) {
  return result;
}

// 2. Deep analysis: AI classification
if (useAI && confidence <= threshold) {
  return aiClassification();
}
```

#### 4. Utilities (`src/utils/`)

**Logger**
- 構造化ログ出力
- ログレベル管理
- セクション整形

**File Reader**
- ログファイルの読み込み
- JSON/テキストのパース
- キーワード抽出

**Reporter**
- レポート生成
- 複数フォーマット対応
- 統計分析

## データモデル

### ConversationLog
```typescript
{
  id: string;           // 一意識別子
  timestamp: string;    // ISO 8601形式
  content: string;      // 会話内容
  project?: string;     // プロジェクト名
  confidence?: number;  // 信頼度 (0-1)
}
```

### ClassificationResult
```typescript
{
  conversationId: string;
  originalProject: string;      // 元のプロジェクト
  predictedProject: string;     // 予測されたプロジェクト
  confidence: number;           // 信頼度スコア
  reason: string;               // 判定理由
  timestamp: string;            // 分類時刻
}
```

### ClassificationReport
```typescript
{
  totalProcessed: number;
  classified: number;
  unclassified: number;
  accuracy: number;            // 分類成功率
  errorRate: number;           // エラー率
  results: ClassificationResult[];
  summary: {
    byProject: Record<string, number>;
    avgConfidence: number;
    lowConfidenceCount: number;
  }
}
```

## 分類アルゴリズム

### ハイブリッドアプローチ（推奨）

```
Input: Uncategorized conversations
Output: Classified conversations with confidence scores

1. FOR EACH conversation:
   a. Extract keywords
   b. Match against project patterns
   c. Calculate confidence score
   
   IF confidence >= threshold (default: 0.6):
      → Add to results (keyword-based)
   ELSE:
      → Add to low-confidence queue

2. FOR EACH low-confidence conversation:
   a. Send to Claude AI
   b. Get AI classification with reasoning
   c. Add to results (AI-powered)

3. Generate report with statistics
```

### 信頼度スコアの計算

**キーワードベース:**
```typescript
confidence = matchedKeywords / totalKeywords
// Pattern matches have 2x weight
confidence = (matchedKeywords + 2 * matchedPatterns) / total
```

**AIベース:**
- Claude APIが返す信頼度を使用
- 通常0.7-0.95の範囲

## パフォーマンス最適化

### Rate Limiting
- Anthropic API: 1秒間隔
- バッチサイズ: 10件

### メモリ管理
- ストリーミング処理
- 大規模ログの段階的読み込み

### キャッシング
- プロジェクト設定のメモリキャッシュ
- 頻出パターンの事前コンパイル

## エラーハンドリング

### レベル別対応

**Warning**: 処理は継続
- API接続失敗 → フォールバック
- 一部ログの読み込み失敗

**Error**: 処理は継続（該当項目スキップ）
- 個別の分類失敗
- 不正なログ形式

**Fatal**: プロセス終了
- 設定ファイル不正
- メモリ不足
- 予期しない例外

## 今後の拡張

### Phase 2: プロジェクト理解
- コードベース解析
- 依存関係グラフの構築
- 開発パターンの学習

### Phase 3: 自律的タスク計画
- タスクキューの管理
- 優先度の自動設定
- リソース最適化

### Phase 4: 実装機能
- コード生成
- ファイル操作
- Git操作
- テスト実行

### Phase 5: 自己改善
- パフォーマンス評価
- 設定の自動調整
- 新しいパターンの学習
- A/Bテスト

## セキュリティ考慮事項

### 認証情報管理
- `.env`ファイルは`.gitignore`に追加
- 本番環境では環境変数を使用
- APIキーのローテーション

### データプライバシー
- ログに個人情報を含めない
- API送信前のデータサニタイズ
- ローカルキャッシュの暗号化

### アクセス制御
- Supabase: Row Level Security
- Notion: ワークスペース権限
- ファイルシステム: 適切なパーミッション

