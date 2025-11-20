# GitHub リポジトリ作成ガイド

Musubi専用のGitHubリポジトリを作成する手順です。

## 1. GitHub Personal Access Token の取得

1. GitHubにログインします
2. 右上のプロフィール画像をクリック → **Settings**
3. 左サイドバーの最下部 → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token** → **Generate new token (classic)**
6. 以下の設定を行います：
   - **Note**: `Musubi Repository Creation`
   - **Expiration**: 適切な期間を選択（推奨: 90日またはNo expiration）
   - **Scopes**: 以下の権限にチェック
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
7. **Generate token** をクリック
8. **トークンをコピー**（この画面を離れると二度と表示されません）

## 2. 環境変数の設定

プロジェクトのルートディレクトリに `.env` ファイルを作成（または既存のファイルを編集）し、以下を追加：

```env
GITHUB_TOKEN=your_github_personal_access_token_here
```

## 3. リポジトリの作成

以下のコマンドを実行：

```bash
npm run github:create
```

### オプション

- カスタムリポジトリ名: `npm run github:create my-repo-name`
- プライベートリポジトリ: `npm run github:create musubi --private`
- 説明を追加: `npm run github:create musubi "My custom description"`

## 4. 確認

スクリプトが正常に完了すると、以下の情報が表示されます：

- リポジトリURL
- Clone URL
- 初回コミットとプッシュが完了した旨

## トラブルシューティング

### エラー: "GitHub token not configured"
- `.env` ファイルに `GITHUB_TOKEN` が設定されているか確認
- トークンが正しくコピーされているか確認（前後の空白がないか）

### エラー: "Failed to connect to GitHub"
- トークンの有効期限が切れていないか確認
- トークンに `repo` スコープが含まれているか確認

### エラー: "Repository already exists"
- リポジトリは既に存在しますが、リモート設定とプッシュは実行されます

