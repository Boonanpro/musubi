/**
 * Musubi - Action Types
 * 
 * Types for code generation and file operations
 */

export type ActionType = 'code_generation' | 'file_create' | 'file_edit' | 'file_delete' | 'command_run';

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface Action {
  id: string;
  type: ActionType;
  status: ActionStatus;
  timestamp: string;
  description: string;
  details: CodeGenerationAction | FileOperationAction | CommandAction;
  result?: string;
  error?: string;
}

export interface CodeGenerationAction {
  prompt: string;
  language: string;
  generatedCode: string;
  explanation: string;
}

export interface FileOperationAction {
  path: string;
  operation: 'create' | 'edit' | 'delete' | 'read';
  content?: string;
  oldContent?: string;
  newContent?: string;
}

export interface CommandAction {
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface ActionRequest {
  userMessage: string;
  context?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ActionResponse {
  actions: Action[];
  explanation: string;
  needsApproval: boolean;
}

