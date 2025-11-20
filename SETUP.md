# Musubi セットアップガイド

## 環境変数の設定

`D:\musubi\.env` ファイルに以下の環境変数を設定してください：

```env
# Anthropic Claude API (必須)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase (オプション - データ自動同期用)
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here

# Notion (オプション - 将来の機能用)
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_database_id_here
```

### 現在の設定状況

✅ **ANTHROPIC_API_KEY**: 設定済み
❓ **SUPABASE_URL**: 未設定（データ自動同期を使う場合は設定が必要）
❓ **SUPABASE_KEY**: 未設定（データ自動同期を使う場合は設定が必要）

## Supabaseの設定方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. Chekiが使用しているプロジェクトを選択
3. **Settings** → **API** に移動
4. 以下の情報をコピー：
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
5. `.env` ファイルに追加

## サーバーの起動

```bash
# APIサーバー（ポート3002）
npm run api

# GUIサーバー（ポート3001）
cd musubi-gui
npm run dev
```

## データ自動同期

### スケジュール
- **毎日 00:05**: Supabaseから新しいデータを取得
- **起動時**: 即座に1回実行

### 動作確認
APIサーバーのログに以下が表示されます：

```
[INFO] Starting data sync and analysis...
[INFO] Fetched X new conversations from Supabase
[INFO] Data Analysis Results:
[INFO] - Total logs: XXXX
[INFO] - Classification accuracy: XX%
[SUCCESS] Data sync completed
```

## Musubiの新機能

### 1. 自動データ分析

ユーザーが「データ」「分析」「状況」などのキーワードを含むメッセージを送ると、Musubiは自動的に：
1. ローカルログを読み込む
2. データを分析
3. リアルタイムの統計情報を取得
4. ログサンプルを確認
5. 自分で問題を判断
6. 具体的な改善策を提案

### 2. システムプロンプトの改善

**削除されたもの:**
- 答えのカンニングペーパー
- 事前に教えられた解決策

**追加されたもの:**
- データ分析ツールへのアクセス
- リアルタイム統計情報
- 自分で考えて提案する指示

### 3. データ自動同期

毎日自動的に：
- Supabaseから最新データを取得
- ローカルログを分析
- データ品質を評価
- 問題があれば警告

## テスト方法

### 1. GUIで試す

`http://localhost:3001` にアクセスして、以下のメッセージを送信：

```
現在のデータ状況を分析して
```

Musubiが自動的にデータを分析し、問題点と改善策を提案するはずです。

### 2. データAPIを直接テスト

```bash
# 現在の状況
curl http://localhost:3002/api/data/status

# ログサンプル
curl http://localhost:3002/api/data/logs/sample?limit=5

# 詳細分析
curl http://localhost:3002/api/data/analyze

# Supabase接続テスト
curl http://localhost:3002/api/data/supabase/latest
```

## 期待される動作

### Before（カンニング状態）
```
ユーザー: 「データの問題は？」
Musubi: 「ファイルパス情報が無いことが問題です（システムプロンプトに書いてある）」
```

### After（自分で分析）
```
ユーザー: 「データの問題は？」
Musubi: 
  1. データを取得・分析
  2. 実際のログを確認
  3. 精度を計算
  4. ファイルパス情報の有無をチェック
  5. 「ログの2%にしかファイルパスがなく、そのため分類精度が低い」と自分で判断
  6. 具体的な改善策を提案
```

## 次のステップ

1. ✅ システムプロンプトから答えを削除
2. ✅ データ分析APIを実装
3. ✅ 自動データ同期を実装
4. ⏭️ Supabase認証情報を設定（オプション）
5. ⏭️ コード生成機能の追加
6. ⏭️ 承認フロー実装
7. ⏭️ 完全自律化

## トラブルシューティング

### データ分析が動かない
- Chekiのログパスが正しいか確認: `D:/cheki/data/uncategorized/`
- ログファイルが存在するか確認

### Supabase接続エラー
- `.env` の `SUPABASE_URL` と `SUPABASE_KEY` が正しいか確認
- Supabaseプロジェクトがアクティブか確認

### サーバーが起動しない
- ポート3001, 3002が使用中でないか確認
- `npm install` を実行したか確認

