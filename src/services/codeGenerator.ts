/**
 * Musubi - Code Generator Service
 * 
 * Generates code based on user requirements
 */

import { anthropicService } from '../integrations/anthropic.js';
import { Action, ActionType, CodeGenerationAction, FileOperationAction } from '../types/actions.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class CodeGenerator {
  /**
   * Generate code from user request
   */
  async generateCode(
    userRequest: string,
    context?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<Action[]> {
    try {
      await anthropicService.connect();

      const systemPrompt = `You are a code generation AI. You MUST respond ONLY with valid JSON.

CRITICAL RULES:
1. Response must be ONLY JSON wrapped in \`\`\`json\`\`\`
2. NO explanations before or after the JSON
3. NO additional text or markdown

Response format:

\`\`\`json
{
  "actions": [
    {
      "type": "file_create",
      "path": "src/components/ExampleComponent.tsx",
      "language": "typescript",
      "code": "import React, { useState } from 'react';\\n\\nexport default function Example() {\\n  const [count, setCount] = useState(0);\\n  return (\\n    <div style={{padding: '20px'}}>\\n      <h2>Example Component</h2>\\n      <p>Count: {count}</p>\\n      <button onClick={() => setCount(count + 1)}>Increment</button>\\n    </div>\\n  );\\n}",
      "description": "Example component"
    }
  ]
}
\`\`\`

IMPORTANT:
- Start response with \`\`\`json
- End response with \`\`\`
- "actions" array must have at least 1 action
- path must start with "src/components/"
- code must be complete and functional

CODE GENERATION CONSTRAINTS:
1. **NO external libraries**
   - Only import 'react' (useState, useRef, etc.)
   - NO axios, recordrtc, or other packages
   - Use React standard features and Browser APIs only

2. **MUST be functional**
   - Use Hooks (useState, useRef, useEffect)
   - Add inline styles for appearance
   - Include interactive elements (buttons, forms, etc.)

3. **TypeScript only**
   - Include type definitions
   - Use React.FC or function declaration
   - Define interfaces for props

4. **MUST be COMPLETELY SELF-CONTAINED**
   - ❌ FORBIDDEN: import from './OtherComponent'
   - ❌ FORBIDDEN: import { helper } from '../utils'
   - ✅ ONLY ALLOWED: import React, { useState } from 'react'
   - ALL functionality in ONE file
   - If you need multiple components, define them in the SAME file

EXAMPLE (CORRECT - all in one file):
\`\`\`typescript
import React, { useState } from 'react';

// Helper component defined in SAME file
const Helper: React.FC<{ text: string }> = ({ text }) => (
  <div>{text}</div>
);

// Main component
const Main: React.FC = () => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Helper text="Hello" />
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  );
};

export default Main;
\`\`\``;

      const prompt = `ユーザーの要望:
${userRequest}

上記の要望を実装してください。`;

      const response = await anthropicService.chat(
        systemPrompt,
        prompt,
        conversationHistory
      );

      // Parse JSON from response
      logger.info('Parsing response from Claude...');
      logger.info(`Response length: ${response.length} chars`);
      
      let jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        logger.warn('First JSON pattern failed, trying without newlines...');
        jsonMatch = response.match(/```json([\s\S]*?)```/);
      }
      if (!jsonMatch) {
        logger.warn('Second JSON pattern failed, trying to find JSON object...');
        jsonMatch = response.match(/\{[\s\S]*"actions"[\s\S]*\}/);
        if (jsonMatch) {
          jsonMatch[1] = jsonMatch[0];
        }
      }
      if (!jsonMatch) {
        logger.error('All JSON patterns failed!');
        logger.error('Response preview (first 500 chars):', response.substring(0, 500));
        throw new Error('Failed to parse code generation response. Response did not contain valid JSON.');
      }
      
      logger.success('JSON pattern matched successfully');

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        logger.error('JSON parse error:', parseError);
        logger.error('Attempted to parse:', jsonMatch[1]);
        throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Convert to Action objects
      const actions: Action[] = [];

      for (const actionData of parsed.actions) {
        const actionId = uuidv4();
        
        let action: Action;

        if (actionData.type === 'code_generation') {
          action = {
            id: actionId,
            type: 'code_generation',
            status: 'pending',
            timestamp: new Date().toISOString(),
            description: actionData.description || 'Code generation',
            details: {
              prompt: userRequest,
              language: actionData.language || 'typescript',
              generatedCode: actionData.code,
              explanation: actionData.description || '',
            } as CodeGenerationAction,
          };
        } else if (actionData.type === 'file_create' || actionData.type === 'file_edit') {
          action = {
            id: actionId,
            type: actionData.type,
            status: 'pending',
            timestamp: new Date().toISOString(),
            description: actionData.description || `${actionData.type}: ${actionData.path}`,
            details: {
              path: actionData.path,
              operation: actionData.type === 'file_create' ? 'create' : 'edit',
              content: actionData.code,
            } as FileOperationAction,
          };
        } else {
          logger.warn(`Unknown action type: ${actionData.type}`);
          continue;
        }

        actions.push(action);
      }

      logger.success(`Generated ${actions.length} actions for user request`);
      return actions;

    } catch (error) {
      logger.error('Failed to generate code', error);
      throw error;
    }
  }

  /**
   * Generate simple code snippet (for quick responses)
   */
  async generateSnippet(
    language: string,
    description: string
  ): Promise<string> {
    try {
      await anthropicService.connect();

      const prompt = `Generate ${language} code for: ${description}

Return only the code, no explanation.`;

      const response = await anthropicService.chat(
        'You are a code generator. Generate clean, working code.',
        prompt
      );

      // Extract code from markdown code blocks if present
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
      return codeMatch ? codeMatch[1] : response;

    } catch (error) {
      logger.error('Failed to generate code snippet', error);
      throw error;
    }
  }
}

export const codeGenerator = new CodeGenerator();

