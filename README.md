# 🌟 Musubi - ゼロパーソンカンパニーOS

**産霊（むすひ）** - AIだけで高品質なソフトウェアを開発する、完全自律型開発システム

---

## 🚀 クイックスタート

### Docker版（推奨・完全自律）

**必要なもの:**
- Docker Desktop
- `.env`ファイル（APIキー設定）

**手順:**

```bash
# リポジトリをクローン
git clone https://github.com/your-repo/musubi
cd musubi

# .envファイルを作成
cp .env.example .env
# .envにAPIキーを設定してください

# Docker起動
docker-compose up --build
```

**アクセス:**
- GUI: http://localhost:3001
- API: http://localhost:3002
- Preview: http://localhost:3003

---

## 🐳 Docker版の利点

### 完全な自律性
- ✅ Musubiが自分でnpmパッケージをインストール
- ✅ Python、Node.js、Bashコードを実行
- ✅ エラーが出ても自分で解決
- ✅ 人間の承認不要

### 安全性
- ✅ Docker内で完全に隔離
- ✅ ホストPCは完全に保護
- ✅ 壊れても`docker-compose restart`で復旧

### 再現性
- ✅ どこでも同じ環境で動作
- ✅ 依存関係の問題なし

---

## 📊 Docker版 vs 通常版

| 機能 | Docker版 | 通常版 |
|------|---------|--------|
| セットアップ | やや複雑 | 簡単 |
| Musubiの自律性 | 🚀 完全自律 | 🔒 制限あり |
| npm install | ✅ 自分で実行 | ❌ 人間に依頼 |
| コード実行 | ✅ 自由 | ❌ 不可 |
| セキュリティ | ✅ 隔離済み | ⚠️ 注意が必要 |
| 推奨用途 | 本番・開発 | 開発のみ |

---

## 🛠️ 通常版（開発用）

**必要なもの:**
- Node.js v18以上
- npm

**手順:**

```bash
# 依存関係をインストール
npm install
cd musubi-gui && npm install && cd ..

# .envファイルを作成
cp .env.example .env
# .envにAPIキーを設定

# 起動
npm run dev
```

**制限:**
- Musubiは自分でnpmパッケージをインストールできません
- 新しいパッケージが必要な場合、人間に依頼します

---

## 🔧 Docker コマンド

```bash
# 起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# 停止
docker-compose down

# 再起動
docker-compose restart

# ログを見る
docker-compose logs -f

# コンテナに入る
docker-compose exec musubi bash

# 完全にクリーンアップ
docker-compose down -v
docker system prune -a
```

---

## 📁 プロジェクト構造

```
musubi/
├── Dockerfile              # Docker設定
├── docker-compose.yml      # Docker Compose設定
├── src/
│   ├── api/               # APIサーバー
│   ├── services/
│   │   └── toolSystem.ts  # ツールシステム（重要）
│   └── integrations/      # 外部サービス統合
├── musubi-gui/            # フロントエンド
├── public/previews/       # 生成されたプロジェクト
└── workspace/             # Musubiの作業領域
```

---

## 🎯 Musubiの能力（Docker版）

### 自律的な開発
```
ユーザー: 「QRコードを生成するアプリを作って」

Musubi:
1. 思考: QRコード生成にはqrcodeパッケージが必要
2. 実行: npm install qrcode
3. 開発: qrcodeを使ったHTMLアプリを生成
4. 完成: プレビュー表示
```

### 自己改善
```
ユーザー: 「チャート表示機能を追加して」

Musubi:
1. 思考: Chart.jsが必要
2. 実行: npm install chart.js
3. 開発: Chart.jsを統合
4. 完成: 更新されたアプリ
```

---

## 🔐 環境変数

`.env`ファイルに以下を設定：

```env
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# GitHub (リポジトリ作成用)
GITHUB_TOKEN=your_github_personal_access_token

# その他
NODE_ENV=production
```

### GitHubリポジトリの作成

Musubi専用のGitHubリポジトリを作成するには：

1. GitHub Personal Access Tokenを取得（[詳細ガイド](docs/GITHUB_SETUP.md)）
2. `.env`ファイルに`GITHUB_TOKEN`を設定
3. 以下のコマンドを実行：

```bash
npm run github:create
```

詳細は [GitHubセットアップガイド](docs/GITHUB_SETUP.md) を参照してください。

---

## 🐛 トラブルシューティング

### Docker起動エラー

```bash
# ポートが使われている場合
docker-compose down
# ポート3001,3002,3003を使っているプロセスを停止

# イメージを再ビルド
docker-compose build --no-cache
docker-compose up
```

### Musubiがツールを使わない

1. Docker環境で起動しているか確認
2. ログを確認: `docker-compose logs -f`
3. 環境変数`MUSUBI_DOCKER=true`が設定されているか確認

---

## 📖 ドキュメント

- [アーキテクチャ](docs/architecture.md)
- [ツールシステム](docs/tools.md)
- [開発ガイド](docs/development.md)

---

## 🤝 コントリビューション

Musubiはゼロパーソンカンパニーのコア技術です。
将来的にJarvisの一部として商用提供される可能性があります。

---

## 📜 ライセンス

MIT License

---

## 🌟 特徴

- **完全自律型**: AIが自分で必要なツールを取得
- **自己改善**: 継続的に能力を拡張
- **安全**: Docker環境で隔離
- **拡張可能**: カスタムツールを追加可能

---

**Musubi - 産霊（むすひ）**  
*生成・結合・調和*
