# Musubi 開発ガイド

## プロジェクトの理念

Musubiは「産霊（むすひ）」の名の通り、自律的に成長し、調和を保ちながら価値を生み出すシステムを目指しています。

## 開発フロー

### ブランチ戦略

```
main
  └─ develop
      ├─ feature/log-classification
      ├─ feature/ai-integration
      └─ feature/self-improvement
```

### コミットメッセージ

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・ツール関連

**例:**
```
feat: Add hybrid classification strategy

- Implement keyword-based first pass
- Use AI for low-confidence cases
- Add confidence threshold configuration

Closes #12
```

## コーディング規約

### TypeScript Style Guide

```typescript
// ✅ Good
export class LogClassifier {
  private projects: Project[];
  
  constructor(projects: Project[]) {
    this.projects = projects;
  }
  
  async classify(log: ConversationLog): Promise<ClassificationResult> {
    // Implementation
  }
}

// ❌ Bad
export class logClassifier {
  constructor(public projects) { } // 型なし
  
  classify(log) { // async/await なし、型なし
    return null;
  }
}
```

### ファイル構成

```typescript
/**
 * Module description
 */

// 1. Imports
import { external } from 'external-lib';
import { internal } from '../internal.js';

// 2. Types/Interfaces
export interface Config { }

// 3. Constants
const DEFAULT_VALUE = 100;

// 4. Main implementation
export class MyClass { }

// 5. Utility functions
function helperFunction() { }
```

### エラーハンドリング

```typescript
// ✅ Good
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', error);
  throw new Error('Specific error message');
}

// ❌ Bad
try {
  await riskyOperation();
} catch (e) {
  console.log(e); // logger使用
  // エラーを握りつぶさない
}
```

## テスト

### ユニットテスト

```typescript
// tests/classifiers/logClassifier.test.ts
import { describe, it, expect } from 'vitest';
import { LogClassifier } from '../../src/classifiers/logClassifier.js';

describe('LogClassifier', () => {
  it('should classify by keywords', async () => {
    const classifier = new LogClassifier(mockProjects, false);
    const result = await classifier.classify(mockLog);
    
    expect(result.predictedProject).toBe('jarvis');
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});
```

### 実行

```bash
npm test
```

## Phase別実装ガイド

### Phase 1: ログ分類 ✅

**完了項目:**
- [x] プロジェクトセットアップ
- [x] 外部サービス連携
- [x] キーワードベース分類
- [x] AI分類
- [x] ハイブリッド分類
- [x] レポート生成

### Phase 2: プロジェクト理解（予定）

**TODO:**
- [ ] コードベース解析
- [ ] 依存関係マッピング
- [ ] パターン学習
- [ ] コンテキスト構築

**実装例:**
```typescript
// src/analyzers/codebaseAnalyzer.ts
export class CodebaseAnalyzer {
  async analyzeProject(projectPath: string): Promise<ProjectContext> {
    // ファイル構造解析
    // 依存関係抽出
    // パターン検出
  }
}
```

### Phase 3: 自律的タスク計画（予定）

**TODO:**
- [ ] タスクキュー管理
- [ ] 優先度付け
- [ ] リソース最適化
- [ ] スケジューリング

### Phase 4: 実装機能（予定）

**TODO:**
- [ ] コード生成
- [ ] ファイル操作
- [ ] Git操作
- [ ] テスト実行
- [ ] デプロイ

### Phase 5: 自己改善（予定）

**TODO:**
- [ ] パフォーマンス評価
- [ ] 設定の自動調整
- [ ] 学習ループ
- [ ] A/Bテスト

## 新機能の追加

### 1. Issue作成

```markdown
## Feature Request: [機能名]

### 背景
なぜこの機能が必要か

### 提案
どのように実装するか

### 受け入れ基準
- [ ] 条件1
- [ ] 条件2
```

### 2. ブランチ作成

```bash
git checkout -b feature/your-feature-name
```

### 3. 実装

```typescript
// 1. 型定義追加
export interface NewFeature { }

// 2. 実装
export class NewFeatureImpl implements NewFeature { }

// 3. テスト
describe('NewFeature', () => { });

// 4. ドキュメント更新
```

### 4. プルリクエスト

```markdown
## Changes
- 変更内容の説明

## Testing
- テスト方法

## Screenshots (if applicable)
```

## デバッグ

### ログレベルの調整

```typescript
import { logger, LogLevel } from './utils/logger.js';

// 開発時
logger.setLevel(LogLevel.DEBUG);

// 本番環境
logger.setLevel(LogLevel.INFO);
```

### VSCode デバッグ設定

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Musubi",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "tsx"],
      "console": "integratedTerminal"
    }
  ]
}
```

## パフォーマンス最適化

### プロファイリング

```typescript
const start = Date.now();
await heavyOperation();
const duration = Date.now() - start;
logger.debug(`Operation took ${duration}ms`);
```

### メモリ管理

```typescript
// ストリーミング処理を使用
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const fileStream = createReadStream('large-file.log');
const rl = createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

for await (const line of rl) {
  processLine(line);
}
```

## CI/CD（今後）

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run build
```

## リリースプロセス

1. バージョン更新
```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

2. CHANGELOG更新

3. Git tag作成
```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## コミュニティ

### 質問・提案

- Issue: バグ報告、機能リクエスト
- Discussion: 一般的な質問、アイデア共有

### コントリビューション

どんな小さな貢献でも歓迎します：
- タイポ修正
- ドキュメント改善
- バグ報告
- 新機能提案
- コードレビュー

---

一緒に素晴らしいものを作りましょう！🌟

