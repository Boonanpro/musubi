/**
 * Musubi - Action Manager
 * 
 * Manages pending actions and their execution
 */

import { Action, ActionStatus } from '../types/actions.js';
import { logger } from '../utils/logger.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ActionManager {
  private pendingActions: Map<string, Action> = new Map();

  /**
   * Add a new action to the pending queue
   */
  addAction(action: Action): void {
    this.pendingActions.set(action.id, action);
    logger.info(`Action ${action.id} added to queue: ${action.type}`);
  }

  /**
   * Get all pending actions
   */
  getPendingActions(): Action[] {
    return Array.from(this.pendingActions.values())
      .filter(a => a.status === 'pending');
  }

  /**
   * Get action by ID
   */
  getAction(id: string): Action | undefined {
    return this.pendingActions.get(id);
  }

  /**
   * Approve an action
   */
  approveAction(id: string): boolean {
    const action = this.pendingActions.get(id);
    if (!action || action.status !== 'pending') {
      return false;
    }

    action.status = 'approved';
    logger.success(`Action ${id} approved`);
    return true;
  }

  /**
   * Reject an action
   */
  rejectAction(id: string, reason?: string): boolean {
    const action = this.pendingActions.get(id);
    if (!action || action.status !== 'pending') {
      return false;
    }

    action.status = 'rejected';
    action.error = reason || 'User rejected';
    logger.warn(`Action ${id} rejected: ${reason || 'User decision'}`);
    return true;
  }

  /**
   * Execute an approved action
   */
  async executeAction(id: string): Promise<{ success: boolean; result?: string; error?: string }> {
    const action = this.pendingActions.get(id);
    
    if (!action) {
      return { success: false, error: 'Action not found' };
    }

    if (action.status !== 'approved') {
      return { success: false, error: 'Action not approved' };
    }

    try {
      logger.info(`Executing action ${id}: ${action.type}`);

      let result: string;

      switch (action.type) {
        case 'file_create':
        case 'file_edit':
          result = await this.executeFileOperation(action);
          break;

        case 'file_delete':
          result = await this.executeFileDelete(action);
          break;

        case 'command_run':
          result = await this.executeCommand(action);
          break;

        case 'code_generation':
          // Code generation doesn't execute anything, just returns the code
          result = 'Code generated successfully';
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      action.status = 'executed';
      action.result = result;
      logger.success(`Action ${id} executed successfully`);

      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      action.status = 'failed';
      action.error = errorMessage;
      logger.error(`Action ${id} failed:`, error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute file create/edit operation
   */
  private async executeFileOperation(action: Action): Promise<string> {
    if (action.type !== 'file_create' && action.type !== 'file_edit') {
      throw new Error('Invalid action type for file operation');
    }

    const details = action.details as any;
    const { path, content } = details;

    if (!path || content === undefined) {
      throw new Error('Missing path or content for file operation');
    }

    // Ensure directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write file
    writeFileSync(path, content, 'utf-8');

    return `File ${action.type === 'file_create' ? 'created' : 'updated'}: ${path}`;
  }

  /**
   * Execute file delete operation
   */
  private async executeFileDelete(action: Action): Promise<string> {
    const details = action.details as any;
    const { path } = details;

    if (!path) {
      throw new Error('Missing path for file delete');
    }

    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }

    unlinkSync(path);
    return `File deleted: ${path}`;
  }

  /**
   * Execute command
   */
  private async executeCommand(action: Action): Promise<string> {
    const details = action.details as any;
    const { command, workingDirectory } = details;

    if (!command) {
      throw new Error('Missing command');
    }

    const options = workingDirectory ? { cwd: workingDirectory } : {};
    const { stdout, stderr } = await execAsync(command, options);

    if (stderr) {
      logger.warn(`Command stderr: ${stderr}`);
    }

    return stdout || 'Command executed successfully';
  }

  /**
   * Read file content
   */
  readFile(path: string): string {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }

    return readFileSync(path, 'utf-8');
  }

  /**
   * Check if file exists
   */
  fileExists(path: string): boolean {
    return existsSync(path);
  }

  /**
   * Clear executed/rejected actions (cleanup)
   */
  cleanup(): void {
    const toRemove: string[] = [];
    
    this.pendingActions.forEach((action, id) => {
      if (action.status === 'executed' || action.status === 'rejected') {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.pendingActions.delete(id));
    
    if (toRemove.length > 0) {
      logger.info(`Cleaned up ${toRemove.length} completed actions`);
    }
  }
}

export const actionManager = new ActionManager();

