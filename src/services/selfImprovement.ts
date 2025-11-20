/**
 * Musubi - Self Improvement Service
 * 
 * Allows Musubi to analyze and improve its own code
 */

import { readFileSync, existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import { anthropicService } from '../integrations/anthropic.js';
import { codeGenerator } from './codeGenerator.js';
import { actionManager } from './actionManager.js';
import { Action } from '../types/actions.js';
import { v4 as uuidv4 } from 'uuid';

export class SelfImprovementService {
  private musubiSourceFiles = [
    'src/services/codeGenerator.ts',
    'src/api/routes/chat.ts',
    'src/api/routes/code.ts',
    'src/services/actionManager.ts',
    'src/services/evaluationManager.ts',
  ];

  /**
   * Analyze a problem and propose self-improvements
   */
  async analyzeProblem(
    problemDescription: string,
    evaluationData?: string
  ): Promise<{ analysis: string; actions: Action[] }> {
    try {
      await anthropicService.connect();

      logger.info('Starting self-improvement analysis...');

      // Read relevant source files
      const sourceFiles = this.readSourceFiles();

      const systemPrompt = `You are Musubi - Self-Improvement AI.

You can read your own source code, identify problems, and propose fixes.

RESPONSE FORMAT - SIMPLE ANALYSIS ONLY:

\`\`\`json
{
  "analysis": "Brief problem description",
  "findings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": [
    {
      "file": "src/services/codeGenerator.ts",
      "issue": "Specific problem in this file",
      "solution": "How to fix it (no code, just description)",
      "lineNumbers": "Approximate line numbers (e.g. 50-60)"
    }
  ],
  "expectedImpact": "Expected improvement"
}
\`\`\`

RULES:
1. Response MUST be ONLY JSON wrapped in \`\`\`json\`\`\`
2. NO code in JSON - only descriptions
3. NO oldCode or newCode fields
4. Keep it simple and clear

IMPORTANT:
- Analyze the source code carefully
- Identify specific files and line numbers
- Describe the fix clearly (but don't include actual code)
- Be concise`;

      const userPrompt = `【報告された問題】
${problemDescription}

${evaluationData ? `【評価データ】\n${evaluationData}\n` : ''}

【あなたのソースコード】
${sourceFiles}

上記のソースコードを分析し、問題の原因を特定して、修正案を提案してください。`;

      const response = await anthropicService.chat(
        systemPrompt,
        userPrompt
      );

      // Parse JSON response
      logger.info('Self-improvement response received, parsing...');
      
      let jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        jsonMatch = response.match(/```json([\s\S]*?)```/);
      }
      if (!jsonMatch) {
        jsonMatch = response.match(/\{[\s\S]*"analysis"[\s\S]*\}/);
        if (jsonMatch) {
          jsonMatch[1] = jsonMatch[0];
        }
      }

      if (!jsonMatch) {
        logger.error('Self-improvement response (first 1000 chars):', response.substring(0, 1000));
        throw new Error('Failed to parse self-improvement response - no JSON found');
      }

      logger.info('JSON pattern matched, attempting parse...');
      
      let parsed;
      try {
        // Clean up the JSON string before parsing
        let jsonStr = jsonMatch[1].trim();
        
        // Log the JSON string for debugging (first 500 chars)
        logger.info('JSON to parse (first 500 chars):', jsonStr.substring(0, 500));
        
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        logger.error('JSON parse error:', parseError);
        logger.error('Failed to parse:', jsonMatch[1].substring(0, 500));
        throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const analysis = `
【自己診断結果】

${parsed.analysis}

【発見した問題】
${parsed.findings ? parsed.findings.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n') : 'なし'}

【推奨される修正】
${parsed.recommendations ? parsed.recommendations.map((r: any, i: number) => `
${i + 1}. **${r.file}** (行 ${r.lineNumbers})
   問題: ${r.issue}
   解決策: ${r.solution}
`).join('\n') : 'なし'}

【期待される改善効果】
${parsed.expectedImpact}

---

**重要**: 上記の推奨事項をもとに、具体的な修正を実装します。
`;

      // Generate simple action placeholders for user approval
      const actions: Action[] = [];
      
      if (parsed.recommendations) {
        for (const rec of parsed.recommendations) {
          const action: Action = {
            id: uuidv4(),
            type: 'file_edit',
            status: 'pending',
            timestamp: new Date().toISOString(),
            description: `【自己改善】${rec.file}: ${rec.issue}`,
            details: {
              path: rec.file,
              operation: 'edit',
              content: `修正内容: ${rec.solution}\n行番号: ${rec.lineNumbers}`,
            },
          };
          actions.push(action);
        }
      }

      logger.success(`Self-improvement analysis completed: ${parsed.recommendations?.length || 0} recommendations, ${actions.length} actions created`);

      return {
        analysis,
        actions,
      };

    } catch (error) {
      logger.error('Self-improvement analysis failed', error);
      throw error;
    }
  }

  /**
   * Read Musubi's source files
   */
  private readSourceFiles(): string {
    let content = '';

    for (const filePath of this.musubiSourceFiles) {
      if (existsSync(filePath)) {
        try {
          const fileContent = readFileSync(filePath, 'utf-8');
          content += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          content += `【${filePath}】\n`;
          content += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          content += fileContent;
          content += `\n\n`;
        } catch (error) {
          logger.warn(`Failed to read ${filePath}`, error);
        }
      }
    }

    return content;
  }

  /**
   * Get relevant context for self-improvement
   */
  async getImprovementContext(): Promise<string> {
    const sourceFiles = this.readSourceFiles();
    return `
【Musubiのソースコード】

あなた（Musubi）は以下のソースコードで動いています：

${sourceFiles}

これらのファイルを読んで、自分の問題を診断してください。
`;
  }
}

export const selfImprovementService = new SelfImprovementService();

