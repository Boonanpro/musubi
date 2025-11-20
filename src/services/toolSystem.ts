import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required?: boolean;
    };
  };
  execute(params: any): Promise<string>;
}

export class ToolSystem {
  private tools: Map<string, Tool> = new Map();
  private isDocker: boolean;

  constructor() {
    // Docker環境かどうかを判定
    this.isDocker = process.env.MUSUBI_DOCKER === 'true';
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // npm installツール
    this.registerTool({
      name: 'npm_install',
      description: 'Install npm package in Musubi server environment',
      parameters: {
        packageName: {
          type: 'string',
          description: 'Name of the npm package to install',
          required: true,
        },
      },
      execute: async (params: { packageName: string }) => {
        if (!this.isDocker) {
          return 'ERROR: npm_install is only available in Docker environment. Please ask human to install the package manually.';
        }

        logger.info(`[Tool] npm install ${params.packageName}`);
        try {
          const { stdout, stderr } = await execAsync(
            `npm install ${params.packageName}`,
            { cwd: '/app' }
          );
          logger.info(`[Tool] Successfully installed ${params.packageName}`);
          return `Successfully installed ${params.packageName}\n${stdout}${stderr}`;
        } catch (error: any) {
          logger.error(`[Tool] Failed to install ${params.packageName}:`, error);
          return `ERROR: Failed to install ${params.packageName}\n${error.message}`;
        }
      },
    });

    // コード実行ツール（Python）
    this.registerTool({
      name: 'execute_python',
      description: 'Execute Python code in Musubi server environment',
      parameters: {
        code: {
          type: 'string',
          description: 'Python code to execute',
          required: true,
        },
      },
      execute: async (params: { code: string }) => {
        if (!this.isDocker) {
          return 'ERROR: execute_python is only available in Docker environment.';
        }

        logger.info(`[Tool] Executing Python code...`);
        try {
          const { stdout, stderr } = await execAsync(
            `python3 -c "${params.code.replace(/"/g, '\\"')}"`,
            { cwd: '/app/workspace' }
          );
          return `${stdout}${stderr}`;
        } catch (error: any) {
          logger.error(`[Tool] Python execution error:`, error);
          return `ERROR: ${error.message}\n${error.stdout || ''}${error.stderr || ''}`;
        }
      },
    });

    // コード実行ツール（Node.js）
    this.registerTool({
      name: 'execute_nodejs',
      description: 'Execute Node.js code in Musubi server environment',
      parameters: {
        code: {
          type: 'string',
          description: 'Node.js code to execute',
          required: true,
        },
      },
      execute: async (params: { code: string }) => {
        if (!this.isDocker) {
          return 'ERROR: execute_nodejs is only available in Docker environment.';
        }

        logger.info(`[Tool] Executing Node.js code...`);
        try {
          const { stdout, stderr } = await execAsync(
            `node -e "${params.code.replace(/"/g, '\\"')}"`,
            { cwd: '/app/workspace' }
          );
          return `${stdout}${stderr}`;
        } catch (error: any) {
          logger.error(`[Tool] Node.js execution error:`, error);
          return `ERROR: ${error.message}\n${error.stdout || ''}${error.stderr || ''}`;
        }
      },
    });

    // ターミナルコマンド実行ツール
    this.registerTool({
      name: 'execute_terminal',
      description: 'Execute terminal command in Musubi server environment',
      parameters: {
        command: {
          type: 'string',
          description: 'Terminal command to execute',
          required: true,
        },
      },
      execute: async (params: { command: string }) => {
        if (!this.isDocker) {
          return 'ERROR: execute_terminal is only available in Docker environment.';
        }

        logger.info(`[Tool] Executing terminal command: ${params.command}`);
        try {
          // バックグラウンド実行（& で終わる）の場合は短いタイムアウト
          const isBackground = params.command.includes('&');
          const timeout = isBackground ? 5000 : 30000; // 5秒 or 30秒
          
          // pkillコマンドのエラーを無視する（プロセスが見つからない場合も正常）
          const commandToRun = params.command.replace(/pkill.*\|\| true/g, (match) => {
            return match.replace('|| true', '2>/dev/null || true');
          });
          
          const { stdout, stderr } = await execAsync(commandToRun, {
            cwd: '/app/workspace',
            timeout: timeout,
            // pkillのエラーを無視
            shell: '/bin/bash',
          });
          return `${stdout}${stderr}`;
        } catch (error: any) {
          // pkillコマンドのエラーは無視（プロセスが見つからない場合も正常）
          if (params.command.includes('pkill') && error.code === 1) {
            logger.info(`[Tool] pkill command returned exit code 1 (process not found), ignoring error`);
            return `Process not found (this is normal if the process was not running)`;
          }
          
          logger.error(`[Tool] Terminal command error:`, error);
          // タイムアウトエラーでもstdoutがあれば返す
          if (error.killed && error.stdout) {
            return `${error.stdout}${error.stderr || ''}`;
          }
          return `ERROR: ${error.message}\n${error.stdout || ''}${error.stderr || ''}`;
        }
      },
    });

    // ファイル書き込みツール
    this.registerTool({
      name: 'write_file',
      description: 'Write content to file in Musubi workspace',
      parameters: {
        path: {
          type: 'string',
          description: 'File path relative to workspace',
          required: true,
        },
        content: {
          type: 'string',
          description: 'File content',
          required: true,
        },
      },
      execute: async (params: { path: string; content: string }) => {
        const workspaceDir = this.isDocker ? '/app/workspace' : 'D:\\musubi\\workspace';
        const filePath = path.join(workspaceDir, params.path);

        logger.info(`[Tool] Writing to ${filePath}`);
        try {
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, params.content);
          return `Successfully wrote to ${params.path}`;
        } catch (error: any) {
          logger.error(`[Tool] File write error:`, error);
          return `ERROR: Failed to write file\n${error.message}`;
        }
      },
    });

    // ファイル読み込みツール
    this.registerTool({
      name: 'read_file',
      description: 'Read content from file in Musubi workspace',
      parameters: {
        path: {
          type: 'string',
          description: 'File path relative to workspace',
          required: true,
        },
      },
      execute: async (params: { path: string }) => {
        const workspaceDir = this.isDocker ? '/app/workspace' : 'D:\\musubi\\workspace';
        const filePath = path.join(workspaceDir, params.path);

        logger.info(`[Tool] Reading from ${filePath}`);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return content;
        } catch (error: any) {
          logger.error(`[Tool] File read error:`, error);
          return `ERROR: Failed to read file\n${error.message}`;
        }
      },
    });
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
    logger.info(`[ToolSystem] Registered tool: ${tool.name}`);
  }

  async executeTool(toolName: string, params: any): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    logger.info(`[ToolSystem] Executing tool: ${toolName}`);
    return await tool.execute(params);
  }

  getToolDescriptions(): string {
    return Array.from(this.tools.values())
      .map(
        (tool) =>
          `### ${tool.name}\n${tool.description}\nParameters: ${JSON.stringify(tool.parameters, null, 2)}`
      )
      .join('\n\n');
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  isDockerEnvironment(): boolean {
    return this.isDocker;
  }

  /**
   * Anthropic Tools API用のスキーマを取得
   */
  getAnthropicToolsSchema() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce((acc, [key, value]) => {
          acc[key] = {
            type: value.type,
            description: value.description,
          };
          return acc;
        }, {} as any),
        required: Object.entries(tool.parameters)
          .filter(([_, value]) => value.required)
          .map(([key]) => key),
      },
    }));
  }
}

export const toolSystem = new ToolSystem();

