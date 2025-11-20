# 🚀 Musubi Temporal セットアップガイド

## 📋 前提条件

- Docker Desktop がインストールされている
- Node.js 18+ がインストールされている
- Supabase プロジェクトが作成されている

---

## ⚙️ セットアップ手順

### 1. Supabaseテーブルを作成

`supabase-temporal-schema.sql` の内容をSupabase SQL Editorで実行してください。

```sql
-- musubi_suggestions テーブル
-- musubi_capability_evaluations テーブル
-- musubi_workflow_executions テーブル
```

### 2. Temporal Serverを起動

```bash
# 方法1: バッチファイル
START-TEMPORAL.bat

# 方法2: 手動
docker-compose -f docker-compose.temporal.yml up -d
```

起動確認:
- Temporal Server: http://localhost:7233
- Temporal UI: http://localhost:8080

### 3. Temporal Workerを起動

```bash
npm run worker
```

ログに以下が表示されればOK:
```
✅ Musubi Temporal Worker started
📋 Task Queue: musubi-analysis-queue
🔄 Listening for workflows...
```

### 4. Musubi API Serverを起動

```bash
npm run api
```

ログに以下が表示されればOK:
```
✅ Temporal Client connected
✅ Continuous analysis workflow started
```

### 5. Musubi GUIを起動

```bash
cd musubi-gui
npm run dev
```

---

## 🎯 一括起動

すべてを一度に起動:

```bash
START-MUSUBI-TEMPORAL.bat
```

---

## 🔍 動作確認

### 1. Temporal UIで確認

http://localhost:8080 を開く

- Workflowsタブに `musubi-continuous-analysis` が表示される
- Status: `Running` になっている

### 2. API経由で確認

```bash
curl http://localhost:3002/api/temporal/status
```

レスポンス:
```json
{
  "success": true,
  "status": {
    "status": "RUNNING",
    "workflowId": "musubi-continuous-analysis",
    "startTime": "2025-11-17T..."
  }
}
```

### 3. 提案を確認

```bash
curl http://localhost:3002/api/temporal/suggestions
```

レスポンス:
```json
{
  "success": true,
  "suggestions": [
    {
      "id": "suggestion-...",
      "title": "...",
      "description": "...",
      "priority": 0.9
    }
  ]
}
```

---

## 🛠️ トラブルシューティング

### Temporal Serverが起動しない

```bash
# Dockerコンテナを確認
docker ps

# ログを確認
docker-compose -f docker-compose.temporal.yml logs
```

### Workerがワークフローを見つけられない

```bash
# Temporal Serverが起動しているか確認
curl http://localhost:7233

# Workerを再起動
npm run worker
```

### 提案が生成されない

1. Temporal UIで `musubi-continuous-analysis` のログを確認
2. Workerのコンソールログを確認
3. Cursor会話ファイルが正しい場所にあるか確認:
   - `D:\n8n-log-collector\logs\jarvis\*.log`
   - `D:\n8n-log-collector\logs\checkie\*.log`
   - `D:\cursor-exported-chats\*.md`

---

## 📊 システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    Musubi GUI (Next.js)                 │
│                   http://localhost:3001                 │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────▼────────────────────────────────┐
│                 Musubi API (Express)                    │
│                http://localhost:3002                    │
│  - /api/temporal/status                                 │
│  - /api/temporal/suggestions                            │
│  - /api/temporal/stream (SSE)                           │
└────────────────────────┬────────────────────────────────┘
                         │ Temporal Client
┌────────────────────────▼────────────────────────────────┐
│              Temporal Server (Docker)                   │
│                http://localhost:7233                    │
│  - Workflow Orchestration                               │
│  - State Management                                     │
│  - Error Handling & Retry                               │
└────────────────────────┬────────────────────────────────┘
                         │ Task Queue
┌────────────────────────▼────────────────────────────────┐
│              Temporal Worker (Node.js)                  │
│                   npm run worker                        │
│  - Execute Workflows                                    │
│  - Execute Activities                                   │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Supabase        Local Logs      Anthropic API
```

---

## 🎉 次のステップ

1. Cursor会話を追加して、自動分析を確認
2. Temporal UIでワークフローの実行状況を監視
3. 提案が生成されたら、能力を提供してMusubiを成長させる

**Musubiは今、真の自己改善AI OSになりました！** 🚀


