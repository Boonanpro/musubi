# Musubi セットアップガイド

## 前提条件

- Node.js 18以上
- npm または yarn
- Chekiが稼働している（D:/n8n-log-collector または C:/Users/emoto/n8n-log-collector）

## インストール手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを編集して、必要な認証情報を設定してください：

```env
# Supabase（オプション - データベースから取得する場合）
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Notion（オプション - レポートをNotionに保存する場合）
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=294a16981cea8009a830e99430944a96

# Anthropic Claude API（オプション - AI分類を使用する場合）
ANTHROPIC_API_KEY=your_anthropic_api_key

# Chekiのパス（自動検出されますが、必要に応じて手動設定可能）
CHEKI_PATH=D:/n8n-log-collector
```

### 3. Anthropic API キーの取得（AI分類を使用する場合）

1. https://console.anthropic.com/ にアクセス
2. アカウントを作成（まだの場合）
3. API Keysセクションで新しいキーを作成
4. `.env`ファイルに設定

### 4. 実行

```bash
# 開発モード（リアルタイム再起動）
npm run dev

# ビルドして実行
npm run build
npm start
```

## 機能レベル

Musubiは設定された認証情報に応じて、異なる機能レベルで動作します：

### レベル1: ローカルのみ（最小構成）
- ✅ Chekiログファイルからの読み込み
- ✅ キーワードベースの分類
- ✅ ローカルレポート生成

**必要な設定**: なし（Chekiのパスのみ）

### レベル2: AI分類
- ✅ レベル1の全機能
- ✅ Claude AIによる高精度な分類
- ✅ ハイブリッド分類（キーワード + AI）

**必要な設定**: `ANTHROPIC_API_KEY`

### レベル3: Notion連携
- ✅ レベル2の全機能
- ✅ レポートをNotionに自動保存

**必要な設定**: `ANTHROPIC_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`

### レベル4: フル機能
- ✅ レベル3の全機能
- ✅ Supabaseからの直接データ取得

**必要な設定**: すべての環境変数

## トラブルシューティング

### Chekiディレクトリが見つからない

エラー: `Cheki directory not found`

解決策:
1. Chekiが実際に稼働しているか確認
2. `.env`ファイルで`CHEKI_PATH`を手動設定
3. パスが正しいか確認（D:/n8n-log-collector または C:/Users/emoto/n8n-log-collector）

### uncategorized-dev.logが見つからない

確認事項:
- Chekiが正常に動作しているか
- `logs/uncategorized/uncategorized-dev.log`が存在するか
- ログファイルにデータが含まれているか

### API接続エラー

各サービスの認証情報が正しいか確認:
- Supabase: URLとKeyが正しいか
- Notion: API Keyが有効か、データベースIDが正しいか
- Anthropic: API Keyが有効か、クレジットが残っているか

## 次のステップ

Phase 1が完了したら：

1. **レポートの確認**
   - `reports/`ディレクトリ内のファイルを確認
   - 分類精度が90%以上か確認

2. **設定の調整**
   - 精度が低い場合は`src/config/index.ts`のキーワードを調整
   - プロジェクト固有のパターンを追加

3. **Phase 2への準備**
   - Supabaseへの分類結果の保存機能追加
   - 実際のログファイル更新機能の実装
   - 継続的な学習・改善ループの構築

## ディレクトリ構造

```
musubi/
├── src/                      # ソースコード
│   ├── index.ts             # メインエントリーポイント
│   ├── config/              # 設定管理
│   ├── integrations/        # 外部サービス連携
│   ├── classifiers/         # 分類ロジック
│   ├── utils/               # ユーティリティ
│   └── types/               # 型定義
├── reports/                 # 生成されたレポート
├── docs/                    # ドキュメント
├── dist/                    # ビルド出力
├── .env                     # 環境変数（要設定）
├── package.json
└── README.md
```

