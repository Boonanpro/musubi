# GitHubリポジトリ作成時の権限エラーについて

## 問題

Fine-grained personal access tokenを使用している場合、リポジトリ作成時に以下のエラーが発生する可能性があります：

```
Resource not accessible by personal access token
```

## 原因

Fine-grained personal access tokenは、デフォルトで既存のリポジトリへのアクセスに制限されています。新しいリポジトリを作成するには、追加の権限が必要です。

## 解決方法

### 方法1: Classic Personal Access Tokenを使用（推奨）

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. **Generate new token (classic)** をクリック
3. 以下のスコープにチェック：
   - ✅ `repo` (Full control of private repositories)
4. トークンを生成してコピー
5. `.env`ファイルの`GITHUB_TOKEN`を更新

### 方法2: Fine-grainedトークンに権限を追加

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. 使用中のトークンを選択
3. **Account permissions**セクションで以下を設定：
   - **Administration**: Read and write
4. 変更を保存

### 方法3: GitHub CLIを使用

GitHub CLIがインストールされている場合：

```bash
# GitHub CLIでログイン
gh auth login

# リポジトリを作成
gh repo create musubi --private --source=. --remote=origin

# プッシュ
git push -u origin main
```

## 確認

トークンの種類を確認するには：
- Classic token: `ghp_`で始まる
- Fine-grained token: `github_pat_`で始まる

