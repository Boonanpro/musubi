# Musubi 自己改善システム

Musubiの自己改善システムは、GPT-5.1が提案した4つのステップで構成されています。

## 📋 システム構成

### ステップ1: ログ解析のタグ付け器
**目的**: 要望の確信度・重要度・実装状況を自動判定

**実装ファイル**:
- `src/types/requirement.ts` - 要望タグの型定義
- `src/services/requirementTagger.ts` - タグ付けロジック
- `supabase/migrations/003_requirement_tags.sql` - Supabaseテーブル

**機能**:
- AIを使って要望テキストを分析
- 確信度（0-1）: これが本当に要望かどうか
- 重要度（0-1）: システムへの影響度
- タスク種別: feature/bugfix/improvement/research/other
- 実装状況: not_started/in_progress/completed/failed

**APIエンドポイント**:
```bash
POST /api/analysis/tag-requirements
```

**使い方**:
```bash
curl -X POST http://localhost:3002/api/analysis/tag-requirements
```

---

### ステップ2: 能力外部評価モジュール
**目的**: 過去の成功/失敗履歴から客観的に能力を評価

**実装ファイル**:
- `src/types/capability.ts` - 能力評価の型定義
- `src/services/capabilityEvaluator.ts` - 能力評価ロジック
- `data/implementation-history.json` - 実装履歴
- `data/capability-profile.json` - 能力プロファイル

**機能**:
- 要望をサブタスクに分解
- 過去の類似タスクの成功率を計算
- 必要な能力と依存関係をチェック
- **客観的な**成功確率を予測（AIの自己評価ではなく、データに基づく）

**評価基準**:
- 過去の成功/失敗履歴
- 必要な能力の有無
- 必要な依存関係（API、ライブラリ）の有無
- タスクの複雑度

**APIエンドポイント**:
```bash
GET /api/analysis/capability-profile
```

**使い方**:
```bash
curl http://localhost:3002/api/analysis/capability-profile
```

---

### ステップ3: 自動情報収集
**目的**: Musubiが自分で必要な情報を収集

**実装ファイル**:
- `src/services/autoInfoGatherer.ts` - 情報収集ロジック

**機能**:
- **Web検索**: 実装例、ドキュメント、チュートリアルを検索
- **GitHub検索**: 類似プロジェクトのコードを検索
- **npm検索**: 必要なパッケージを検索
- **API存在チェック**: APIやライブラリが実在するか確認

**現在の状態**:
- ✅ npm検索: 完全実装済み（npm registry API使用）
- ⚠️ Web検索: シミュレーション（要API統合: Perplexity, Google Custom Search等）
- ⚠️ GitHub検索: シミュレーション（要GitHub Personal Access Token）

**APIエンドポイント**:
```bash
POST /api/analysis/gather-info
Content-Type: application/json

{
  "requirement": "Notion APIを使ってページを作成する機能"
}
```

**使い方**:
```bash
curl -X POST http://localhost:3002/api/analysis/gather-info \
  -H "Content-Type: application/json" \
  -d '{"requirement": "Notion APIを使ってページを作成する機能"}'
```

---

### ステップ4: 成功/失敗パターン分析
**目的**: Musubiの弱点を特定し、改善計画を生成

**実装ファイル**:
- `src/services/patternAnalyzer.ts` - パターン分析ロジック

**機能**:
- **弱い能力の特定**: 成功率が低い能力を抽出
- **繰り返しているミスの検出**: 同じ失敗パターンを特定
- **強みの特定**: 成功率が高い能力を抽出
- **改善計画の生成**: 優先順位付きの改善提案

**分析内容**:
1. 能力ごとの成功率
2. 失敗の根本原因
3. 繰り返しているミスのパターン
4. 推奨される改善アクション

**APIエンドポイント**:
```bash
GET /api/analysis/weakness-report
```

**使い方**:
```bash
curl http://localhost:3002/api/analysis/weakness-report
```

---

## 🔄 統合フロー

Musubiの自己改善ループ:

```
1. 要望抽出
   ↓
2. タグ付け（ステップ1）
   - 確信度・重要度を判定
   - Supabaseに保存
   ↓
3. 能力評価（ステップ2）
   - 過去の履歴から客観的に判定
   - 実装可能かどうか決定
   ↓
4. 情報収集（ステップ3）
   - 実装できない場合、自動で情報収集
   - Web/GitHub/npmから例を探す
   ↓
5. 提案生成
   - ユーザーに何が必要か提案
   - 自動収集した情報を含める
   ↓
6. 実装 & 評価
   - ユーザーが評価を送信
   - 履歴に記録
   ↓
7. パターン分析（ステップ4）
   - 成功/失敗パターンを分析
   - 弱点を特定
   - 改善計画を生成
   ↓
（1に戻る）
```

---

## 📊 データフロー

### Supabase テーブル

1. **requirement_tags**: 要望のタグ情報
   - confidence, importance, implementation_status
   - 高優先度の要望を抽出するビュー: `high_priority_requirements`

2. **conversations**: Cursor会話ログ（既存）

3. **projects**: プロジェクト情報（既存）

### ローカルファイル

1. **data/implementation-history.json**: 実装履歴
2. **data/capability-profile.json**: 能力プロファイル
3. **exported-chats/*.md**: Cursor会話のエクスポート

---

## 🚀 使い方

### 1. Supabaseマイグレーション実行

```bash
# Supabase CLIを使用
supabase db push

# または、SQLを直接実行
psql $DATABASE_URL < supabase/migrations/003_requirement_tags.sql
```

### 2. APIサーバー起動

```bash
cd D:\musubi
npm run api
```

### 3. 要望のタグ付け実行

```bash
curl -X POST http://localhost:3002/api/analysis/tag-requirements
```

### 4. 能力プロファイル確認

```bash
curl http://localhost:3002/api/analysis/capability-profile
```

### 5. 弱点レポート生成

```bash
curl http://localhost:3002/api/analysis/weakness-report
```

### 6. 情報収集テスト

```bash
curl -X POST http://localhost:3002/api/analysis/gather-info \
  -H "Content-Type: application/json" \
  -d '{"requirement": "LINE Messaging APIを使ってメッセージを送信する"}'
```

---

## 🎯 次のステップ

### 短期（すぐに実装可能）

1. **GUIの追加**
   - データ分析ページに「弱点レポート」タブを追加
   - 能力プロファイルを可視化
   - 改善計画を表示

2. **自動情報収集の強化**
   - Web検索APIの統合（Perplexity推奨）
   - GitHub Personal Access Tokenの設定

### 中期（1-2週間）

1. **リアルタイム学習**
   - 評価送信時に自動で履歴更新
   - パターン分析を自動実行

2. **提案の自動生成改善**
   - 収集した情報を提案に含める
   - 具体的なコード例を提示

### 長期（1ヶ月以上）

1. **完全自律化**
   - ユーザーの承認なしで情報収集
   - 自動で依存関係をインストール
   - プロトタイプを自動生成してテスト

2. **メタ学習**
   - 学習方法自体を改善
   - 最適な情報収集戦略を学習

---

## ⚠️ 重要な注意点

### GPT-5.1の指摘を解決した点

✅ **❶ 過剰自信バイアス**
- 解決: `capabilityEvaluator`が過去の履歴から**客観的に**判定
- AIの自己評価ではなく、データに基づく評価

✅ **❷ 要望抽出の曖昧さ**
- 解決: `requirementTagger`が確信度・重要度をタグ付け
- Supabaseに保存して管理

✅ **❸ 手動依存**
- 解決: `autoInfoGatherer`が自動で情報収集
- Web/GitHub/npmから自動検索

✅ **❹ 失敗分析の欠如**
- 解決: `patternAnalyzer`が失敗パターンを分析
- 繰り返しているミスを特定

---

## 📝 まとめ

このシステムにより、Musubiは：

1. **自分の能力を客観的に理解**できる
2. **必要な情報を自動で収集**できる
3. **失敗から学習**できる
4. **具体的な改善計画を立てる**ことができる

## 🎉 実装状況

### ✅ 完了
- **ステップ1**: 要望タグ付けシステム（`requirementTagger`）
- **ステップ2**: 能力外部評価モジュール（`capabilityEvaluator`）
- **ステップ3**: 自動情報収集（`autoInfoGatherer`）
- **ステップ4**: パターン分析（`patternAnalyzer`）
- **統合**: 4ステップの結果を使ったAI動的提案生成

### 🔄 提案生成の仕組み

従来: 固定テンプレート → **現在: Musubi（Claude API）が4ステップの分析結果を元に、その場で提案を考える**

1. ユーザーの要望を読み取る
2. 自分の能力を評価する（できる/できない、確信度、不足している能力）
3. 関連情報を自動収集する（npm、GitHub、Web）
4. 過去の失敗パターンを分析する
5. **これら全てを統合して、Musubi自身が提案を生成する**

**これで、Musubiは本当の「自己改善AI OS」になりました。**

