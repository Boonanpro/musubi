/**
 * Iterative Development Service
 * 
 * Cursor-like multi-step development process
 */

import { anthropicService } from '../integrations/anthropic.js';
import { logger } from '../utils/logger.js';
import { writeFileSync } from 'fs';
import path from 'path';

export interface DevelopmentStep {
  id: string;
  phase: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  componentPath?: string;
  timestamp: string;
}

export interface DevelopmentPlan {
  projectName: string;
  projectDescription: string;
  steps: DevelopmentStep[];
  currentStep: number;
  status: 'planning' | 'developing' | 'completed' | 'failed';
}

class IterativeDevelopmentService {
  private activePlans: Map<string, DevelopmentPlan> = new Map();

  /**
   * Start iterative development process
   */
  async startDevelopment(
    projectId: string,
    description: string,
    onProgress?: (plan: DevelopmentPlan, thinkingLog?: string) => void
  ): Promise<DevelopmentPlan> {
    logger.info(`Starting iterative development for project: ${projectId}`);

    // Ensure Anthropic is connected
    await anthropicService.connect();

    // Step 1: Planning & Analysis
    const plan = await this.createDevelopmentPlan(projectId, description);
    this.activePlans.set(projectId, plan);
    
    if (onProgress) onProgress(plan, `📋 ${plan.steps.length}ステップの開発計画を作成`);

    // Step 2: Execute each step iteratively
    for (let i = 0; i < plan.steps.length; i++) {
      plan.currentStep = i;
      const step = plan.steps[i];
      
      try {
        step.status = 'in_progress';

        await this.executeStepWithStreaming(projectId, plan, step, i, (chunk) => {
          // Send real-time streaming chunks
          if (onProgress) onProgress(plan, chunk);
        });

        step.status = 'completed';
        const componentPath = `src/components/${plan.projectName}.tsx`;
        if (onProgress) onProgress(plan, `\n\n✅ ${step.phase}完了 (${i + 1}/${plan.steps.length})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);

        logger.success(`Completed step ${i + 1}/${plan.steps.length}: ${step.phase}`);
      } catch (error) {
        step.status = 'failed';
        logger.error(`Failed step ${i + 1}: ${step.phase}`, error);
        
        // Cursor-like: Continue despite errors
        logger.warn('エラーが発生しましたが、次のステップに進みます...');
        step.status = 'completed_with_errors';
        
        if (onProgress) onProgress(plan, `\n\n⚠️ エラーが発生 - 次のステップで補完を試みます\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);
        
        // Don't throw, continue to next step
        continue;
      }
    }

    plan.status = 'completed';
    if (onProgress) onProgress(plan, `🎉 開発完了！`);

    logger.success(`Development completed for project: ${projectId}`);
    return plan;
  }

  /**
   * Create development plan by analyzing requirements
   */
  private async createDevelopmentPlan(
    _projectId: string,
    description: string
  ): Promise<DevelopmentPlan> {
    logger.info('🧠 Analyzing requirements and creating development plan...');

    const prompt = `以下の要件から、柔軟で適応的な開発プランを作成してください。

【要件】
${description}

【重要な原則】
1. **日本語ユーザー向けに作成**
   - UIテキスト、コンテンツ、メッセージは全て日本語
   - 日本の文化・慣習に合わせた設計
   - 英語は技術的に必要な部分のみ

2. **柔軟なステップ数**
   - 簡単なタスク: 3-4ステップ
   - 中程度のタスク: 5-7ステップ
   - 複雑なタスク: 8-12ステップ
   - 必要に応じて増減

3. **Cursorのような柔軟性**
   - 各ステップで手段Aが失敗したら手段Bを試す
   - エラーが出てもリトライや代替案で完遂を目指す

**開発フェーズの例**:
- 基本構造/型定義
- コア機能の実装
- UI/UXの実装
- データ処理・ロジック
- エラーハンドリング
- パフォーマンス最適化
- 最終調整

**回答形式（必須）:**
説明は一切不要です。以下のJSON形式のみを返してください。

` + '```json\n' + `{
  "projectName": "プロジェクト名（PascalCase、英数字のみ）",
  "analysis": "要件分析（何を作るか、主な機能、日本語ユーザー向けである点）",
  "steps": [
    {
      "phase": "基本構造",
      "description": "この段階で実装する具体的な内容",
      "details": "実装の詳細指示"
    }
  ]
}
` + '```';

    try {
      const systemPrompt = `あなたは優秀なソフトウェアアーキテクトです。

【重要】必ずJSON形式のみを返してください。説明やコメントは不要です。`;
      
      const response = await anthropicService.chat(
        systemPrompt,
        prompt,
        []
      );

      // Extract JSON from response - try multiple patterns
      let jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        jsonMatch = response.match(/```\s*\n([\s\S]*?)\n```/);
      }
      if (!jsonMatch) {
        // Try to find JSON without code blocks
        const jsonOnly = response.match(/\{[\s\S]*\}/);
        if (jsonOnly) {
          jsonMatch = ['', jsonOnly[0]];
        }
      }
      
      if (!jsonMatch) {
        logger.error(`Failed to extract JSON. Response: ${response.substring(0, 500)}`);
        throw new Error('Failed to extract JSON from planning response');
      }

      const planData = JSON.parse(jsonMatch[1]);

      const plan: DevelopmentPlan = {
        projectName: planData.projectName,
        projectDescription: description,
        steps: planData.steps.map((s: any, i: number) => ({
          id: `step-${i}`,
          phase: s.phase,
          description: s.description,
          status: 'pending',
          timestamp: new Date().toISOString(),
        })),
        currentStep: 0,
        status: 'planning',
      };

      logger.success(`Development plan created: ${plan.steps.length} steps`);
      return plan;
    } catch (error) {
      logger.error('Failed to create development plan', error);
      throw error;
    }
  }

  /**
   * Execute step with real-time streaming (Cursor-like)
   */
  private async executeStepWithStreaming(
    _projectId: string,
    plan: DevelopmentPlan,
    step: DevelopmentStep,
    stepIndex: number,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    logger.info(`🔨 Executing: ${step.phase} (with streaming)`);

    const componentName = plan.projectName;
    const componentPath = `src/components/${componentName}.tsx`;

    // Get previous step's code if exists
    const previousCode = stepIndex > 0 ? await this.readComponentFile(componentPath).catch(() => '') : '';

    // Build prompt for this step
    const prompt = this.buildStepPrompt(
      plan,
      step,
      stepIndex,
      previousCode
    );

    const isFirstStep = stepIndex === 0;

    try {
      const systemPrompt = `あなたは優秀なReact開発者です。

【重要】必ず以下の形式でコードを返してください：
\`\`\`typescript
// コード
\`\`\`

コードブロックの外に説明を書かないでください。コードのみを返してください。`;

      let accumulatedText = '';
      
      onChunk(`\n🔨 ${step.phase}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      onChunk(`📋 ${step.description}\n\n`);
      
      // Stream AI's thinking in real-time (like Cursor)
      const response = await anthropicService.chatStream(
        systemPrompt,
        prompt,
        [],
        (chunk) => {
          accumulatedText += chunk;
          // Send every chunk immediately (no buffering, no filtering)
          onChunk(chunk);
        }
      );

      // Extract code from response - try multiple patterns
      let codeMatch = response.match(/```(?:typescript|tsx|ts|jsx)\s*\n([\s\S]*?)\n```/);
      
      if (!codeMatch) {
        codeMatch = response.match(/```\s*\n([\s\S]*?)\n```/);
      }

      if (!codeMatch) {
        logger.error(`Failed to extract code from response.`);
        logger.error(`Response (first 500 chars): ${response.substring(0, 500)}`);
        logger.error(`Response (last 500 chars): ${response.substring(Math.max(0, response.length - 500))}`);
        throw new Error(`Failed to extract code from response. AI may not have generated code in the expected format.`);
      }

      const code = codeMatch[1];

      // Validate code
      if (!code || code.trim().length === 0) {
        throw new Error('Extracted code is empty');
      }

      // Check if code contains React import
      if (!code.includes('import React') && !code.includes('from \'react\'') && !code.includes('from "react"')) {
        logger.warn('Code does not contain React import, adding it...');
      }

      onChunk(`📝 ${componentPath} にコードを書き込んでいます...`);

      // Write code to file
      const fullPath = path.resolve(process.cwd(), componentPath);
      writeFileSync(fullPath, code, 'utf-8');

      logger.success(`Step executed and file written: ${componentPath}`);
    } catch (error) {
      logger.error(`Failed to execute step: ${step.phase}`, error);
      throw error;
    }
  }

  /**
   * Execute a single development step (legacy, non-streaming)
   */
  private async executeStep(
    _projectId: string,
    plan: DevelopmentPlan,
    step: DevelopmentStep,
    stepIndex: number
  ): Promise<void> {
    logger.info(`🔨 Executing: ${step.phase}`);

    const componentName = plan.projectName;
    const componentPath = `src/components/${componentName}.tsx`;

    // Get previous step's code if exists
    let previousCode = '';
    if (stepIndex > 0) {
      try {
        previousCode = await this.readComponentFile(componentPath);
      } catch (error) {
        // File doesn't exist yet, that's ok
      }
    }

    const prompt = this.buildStepPrompt(
      plan,
      step,
      stepIndex,
      previousCode
    );

    try {
      const systemPrompt = `あなたは優秀なReact開発者です。

【重要】必ず以下の形式でコードを返してください：
\`\`\`typescript
// コード
\`\`\`

コードブロックの外に説明を書かないでください。コードのみを返してください。`;

      const response = await anthropicService.chat(
        systemPrompt,
        prompt,
        []
      );

      // Extract code from response - try multiple patterns
      let codeMatch = response.match(/```(?:typescript|tsx|ts|jsx)\s*\n([\s\S]*?)\n```/);
      
      if (!codeMatch) {
        // Try without language specifier
        codeMatch = response.match(/```\s*\n([\s\S]*?)\n```/);
      }

      if (!codeMatch) {
        logger.error(`Failed to extract code from response.`);
        logger.error(`Response (first 500 chars): ${response.substring(0, 500)}`);
        logger.error(`Response (last 500 chars): ${response.substring(Math.max(0, response.length - 500))}`);
        throw new Error(`Failed to extract code from response. AI may not have generated code in the expected format.`);
      }

      const code = codeMatch[1];

      // Validate code
      if (!code || code.trim().length === 0) {
        throw new Error('Extracted code is empty');
      }

      // Check if code contains React import
      if (!code.includes('import React') && !code.includes('from \'react\'') && !code.includes('from "react"')) {
        logger.warn('Code does not contain React import, adding it...');
        // This might indicate AI didn't return proper code
      }

      // Write code to file
      const fullPath = path.resolve(process.cwd(), componentPath);
      writeFileSync(fullPath, code, 'utf-8');

      step.result = `Component updated: ${componentPath}`;
      step.componentPath = componentPath;

      logger.success(`Step completed: ${step.phase}`);
    } catch (error) {
      logger.error(`Failed to execute step: ${step.phase}`, error);
      throw error;
    }
  }

  /**
   * Build prompt for a specific step
   */
  private buildStepPrompt(
    plan: DevelopmentPlan,
    step: DevelopmentStep,
    stepIndex: number,
    previousCode: string
  ): string {
    const isFirstStep = stepIndex === 0;
    const totalSteps = plan.steps.length;

    let prompt = `あなたは優秀なReact開発者です。

【プロジェクト】${plan.projectName}
【要件】${plan.projectDescription}

【現在のフェーズ】${stepIndex + 1}/${totalSteps} - ${step.phase}
【このステップでやること】
${step.description}

`;

    if (isFirstStep) {
      prompt += `【重要な制約】
1. **完全に自己完結したコンポーネント**を作成
   - ❌ 他のファイルからのimportは禁止
   - ✅ React, useState, useEffect などのHookのみOK
   - ✅ 全ての機能を1ファイルに実装

2. **外部ライブラリ禁止**
   - axios, lodash, moment などNG
   - 標準のfetch, 標準のJavaScript APIのみ使用

3. **TypeScript + 関数コンポーネント**
   - React.FC または function 宣言
   - 型定義を明確に

4. **必ず動作するコード**
   - 基本機能が動くこと最優先
   - エラーが出ないこと
   - エラーが出たら別の手段を試す

5. **inline style使用**
   - CSSファイル不要
   - styleオブジェクトで記述

6. **日本語ユーザー向けに作成（最重要）**
   - UIテキスト、ボタンラベル、メッセージは全て日本語
   - プレースホルダーも日本語
   - エラーメッセージも日本語
   - サンプルデータも日本語・日本の文化に合わせる
   - コメントは日本語

**まずは動く最小限のMVPを作る。あとのステップで改善します。**

**回答形式（必須）:**
説明は一切不要です。以下の形式で完全なコードのみを返してください。

` + '```typescript\n' + `import React, { useState } from 'react';

const ${plan.projectName}: React.FC = () => {
  // 実装
};

export default ${plan.projectName};
` + '```';
    } else {
      prompt += `【前のステップのコード】
` + '```typescript\n' + previousCode + '\n```\n\n' + `
【今回のタスク】
上記コードに以下を追加・改善してください：
${step.description}

**重要:**
- 既存の機能は壊さない
- 段階的に品質を上げる
- 同じく外部ライブラリ禁止、自己完結必須

**回答形式（必須）:**
説明は一切不要です。完全なコンポーネントコード全体を以下の形式で返してください（部分的な修正ではなく、全体を出力）：

` + '```typescript\n' + `// 完全なコード
` + '```';
    }

    return prompt;
  }

  /**
   * Read component file
   */
  private async readComponentFile(componentPath: string): Promise<string> {
    const { readFileSync } = await import('fs');
    const fullPath = path.resolve(process.cwd(), componentPath);
    return readFileSync(fullPath, 'utf-8');
  }

  /**
   * Get development plan status
   */
  getPlan(projectId: string): DevelopmentPlan | undefined {
    return this.activePlans.get(projectId);
  }

  /**
   * Get all active plans
   */
  getAllPlans(): DevelopmentPlan[] {
    return Array.from(this.activePlans.values());
  }
}

export const iterativeDevelopmentService = new IterativeDevelopmentService();

