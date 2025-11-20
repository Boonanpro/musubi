/**
 * Musubi - Type Definitions
 */

export interface ConversationLog {
  id: string;
  timestamp: string;
  content: string;
  project?: string;
  confidence?: number;
}

export interface Project {
  name: string;
  keywords: string[];
  patterns: string[];
  logPath: string;
}

export interface ClassificationResult {
  conversationId: string;
  originalProject: string;
  predictedProject: string;
  confidence: number;
  reason: string;
  timestamp: string;
}

export interface ClassificationReport {
  totalProcessed: number;
  classified: number;
  unclassified: number;
  accuracy: number;
  errorRate: number;
  results: ClassificationResult[];
  summary: {
    byProject: Record<string, number>;
    avgConfidence: number;
    lowConfidenceCount: number;
  };
}

export interface ChekiConfig {
  projects: Project[];
  logDirectory: string;
  uncategorizedPath: string;
}

export interface SupabaseRecord {
  id: string;
  created_at: string;
  conversation_data: any;
  project_name?: string;
}

export interface NotionPage {
  id: string;
  properties: any;
  content: string;
}

