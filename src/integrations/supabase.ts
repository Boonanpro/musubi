/**
 * Musubi - Supabase Integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { SupabaseRecord } from '../types/index.js';
import { RequirementTag } from '../types/requirement.js';

export class SupabaseService {
  private client: SupabaseClient | null = null;

  /**
   * Initialize Supabase client
   */
  async connect(): Promise<boolean> {
    try {
      if (!appConfig.supabase.url || !appConfig.supabase.key) {
        throw new Error('Supabase credentials not configured');
      }

      this.client = createClient(
        appConfig.supabase.url,
        appConfig.supabase.key
      );

      // Test connection
      const { error } = await this.client.from('conversations').select('count').limit(1);
      
      if (error) {
        throw error;
      }

      logger.success('Supabase connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Supabase', error);
      return false;
    }
  }

  /**
   * Fetch conversation logs
   */
  async fetchConversations(filters?: {
    project?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<SupabaseRecord[]> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      let query = this.client.from('conversations').select('*');

      if (filters?.project) {
        query = query.eq('project_name', filters.project);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      logger.info(`Fetched ${data?.length || 0} conversations from Supabase`);
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch conversations', error);
      throw error;
    }
  }

  /**
   * Update conversation project
   */
  async updateConversationProject(
    conversationId: string,
    projectName: string
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('conversations')
        .update({ project_name: projectName })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to update conversation ${conversationId}`, error);
      return false;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byProject: Record<string, number>;
    uncategorized: number;
  }> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('conversations')
        .select('project_name');

      if (error) {
        throw error;
      }

      const stats = {
        total: data.length,
        byProject: {} as Record<string, number>,
        uncategorized: 0,
      };

      data.forEach((record: any) => {
        const project = record.project_name || 'uncategorized';
        stats.byProject[project] = (stats.byProject[project] || 0) + 1;
        if (!record.project_name) {
          stats.uncategorized++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get statistics', error);
      throw error;
    }
  }

  /**
   * Clear all development logs
   */
  async clearDevelopmentLogs(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      logger.info('Clearing all development logs from Supabase...');
      
      const { error } = await this.client
        .from('development_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) {
        throw error;
      }

      logger.success('All development logs cleared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to clear development logs', error);
      throw error;
    }
  }

  /**
   * Save requirement tag to Supabase
   */
  async saveRequirementTag(tag: RequirementTag): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client.from('requirement_tags').upsert({
        id: tag.id,
        content: tag.content,
        source: tag.source,
        project: tag.project,
        confidence: tag.confidence,
        importance: tag.importance,
        implementation_status: tag.implementationStatus,
        task_type: tag.taskType,
        extracted_at: tag.extractedAt,
        last_updated: tag.lastUpdated,
        related_requirements: tag.relatedRequirements,
        why_confident: tag.reasoning.whyConfident,
        why_important: tag.reasoning.whyImportant,
        suggested_priority: tag.reasoning.suggestedPriority,
      });

      if (error) {
        throw error;
      }

      logger.info(`[Supabase] Saved requirement tag: ${tag.id}`);
      return true;
    } catch (error) {
      logger.error('[Supabase] Failed to save requirement tag', error);
      return false;
    }
  }

  /**
   * Fetch high priority requirements
   */
  async fetchHighPriorityRequirements(): Promise<RequirementTag[]> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('high_priority_requirements')
        .select('*')
        .limit(20);

      if (error) {
        throw error;
      }

      return (data || []).map(row => ({
        id: row.id,
        content: row.content,
        source: row.source,
        project: row.project,
        confidence: row.confidence,
        importance: row.importance,
        implementationStatus: row.implementation_status,
        taskType: row.task_type,
        extractedAt: row.extracted_at,
        lastUpdated: row.extracted_at, // Use extracted_at as fallback
        relatedRequirements: [],
        reasoning: {
          whyConfident: '',
          whyImportant: '',
          suggestedPriority: row.suggested_priority || 3,
        },
      }));
    } catch (error) {
      logger.error('[Supabase] Failed to fetch high priority requirements', error);
      return [];
    }
  }

  /**
   * Update implementation status
   */
  async updateImplementationStatus(
    requirementId: string,
    status: RequirementTag['implementationStatus']
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('requirement_tags')
        .update({
          implementation_status: status,
          last_updated: new Date().toISOString(),
        })
        .eq('id', requirementId);

      if (error) {
        throw error;
      }

      logger.info(`[Supabase] Updated status for ${requirementId}: ${status}`);
      return true;
    } catch (error) {
      logger.error('[Supabase] Failed to update implementation status', error);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();

