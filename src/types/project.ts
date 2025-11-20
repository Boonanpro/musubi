/**
 * Project Management Types
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  status: 'active' | 'archived';
  tags: string[];
  componentName?: string; // Component file name without .tsx extension
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: string;
  description: string;
  createdAt: string;
  componentPath?: string;
  evaluationIds: string[];
}

export interface ProjectEvaluation {
  id: string;
  projectId: string;
  versionId: string;
  score: number;
  comments: string;
  timestamp: string;
  componentName?: string;
  filePath?: string;
}

export interface ProjectStats {
  projectId: string;
  totalEvaluations: number;
  averageScore: number;
  latestScore: number;
  scoreImprovement: number;
  versions: number;
}

