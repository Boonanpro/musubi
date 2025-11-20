/**
 * Capability Evaluation System
 * Musubiの能力を客観的に評価するシステム
 */

export interface SubTask {
  id: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  required: boolean;
  completed: boolean;
  requiredCapabilities: string[];
  estimatedEffort: number; // 1-5
}

export interface ImplementationHistory {
  id: string;
  requirementContent: string;
  projectId: string;
  projectName: string;
  result: 'success' | 'failure' | 'partial';
  score?: number; // Evaluation score if available
  timestamp: string;
  feedback?: string;
  capabilitiesUsed: string[];
  dependenciesUsed: string[];
  failureReason?: string;
  subTasks: SubTask[];
}

export interface CapabilityProfile {
  capabilities: { [key: string]: CapabilityLevel };
  availableDependencies: {
    npm: string[];
    apis: string[];
    libraries: string[];
  };
  successPatterns: SuccessPattern[];
  failurePatterns: FailurePattern[];
  totalImplementations: number;
  successfulImplementations: number;
  lastUpdated: string;
}

export interface CapabilityLevel {
  name: string;
  level: 'none' | 'basic' | 'intermediate' | 'advanced';
  successCount: number;
  failureCount: number;
  lastUsed?: string;
  examples: string[]; // Example requirements successfully implemented
}

export interface SuccessPattern {
  pattern: string;
  frequency: number;
  examples: string[];
  keyFactors: string[];
}

export interface FailurePattern {
  pattern: string;
  frequency: number;
  examples: string[];
  rootCauses: string[];
  suggestedFix: string;
}

export interface CapabilityEvaluation {
  requirementId: string;
  requirement: string;
  canImplement: boolean;
  confidence: number; // 0-1
  
  reasoning: {
    subtasks: SubTask[];
    availableCapabilities: string[];
    missingCapabilities: string[];
    dependencyCheck: {
      available: string[];
      missing: string[];
    };
    similarPastImplementations: ImplementationHistory[];
    successRate: number; // 類似タスクの成功率
  };
  
  recommendation: string; // What to request from user if cannot implement
  estimatedSuccessProbability: number; // 0-1: 実際に成功する確率の予測
}

/**
 * Default capability profile for Musubi
 */
export const DEFAULT_CAPABILITIES: { [key: string]: CapabilityLevel } = {
  'react-components': {
    name: 'React Component Creation',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'typescript': {
    name: 'TypeScript Development',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'ui-design': {
    name: 'UI/UX Design',
    level: 'intermediate',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'api-integration': {
    name: 'API Integration',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'file-operations': {
    name: 'File Operations',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'state-management': {
    name: 'State Management',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'browser-apis': {
    name: 'Browser APIs',
    level: 'intermediate',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'real-time-search': {
    name: 'Real-time Web Search',
    level: 'none',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'database-operations': {
    name: 'Database Operations',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
  'backend-development': {
    name: 'Backend Development',
    level: 'advanced',
    successCount: 0,
    failureCount: 0,
    examples: [],
  },
};
