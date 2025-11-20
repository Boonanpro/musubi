/**
 * Musubi - Notion Integration
 */

import { Client } from '@notionhq/client';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { NotionPage } from '../types/index.js';

export class NotionService {
  private client: Client | null = null;

  /**
   * Initialize Notion client
   */
  async connect(): Promise<boolean> {
    try {
      if (!appConfig.notion.apiKey) {
        throw new Error('Notion API key not configured');
      }

      this.client = new Client({
        auth: appConfig.notion.apiKey,
      });

      // Test connection by retrieving database
      await this.client.databases.retrieve({
        database_id: appConfig.notion.databaseId,
      });

      logger.success('Notion connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Notion', error);
      return false;
    }
  }

  /**
   * Query database pages
   */
  async queryDatabase(filters?: any): Promise<NotionPage[]> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      const response = await this.client.databases.query({
        database_id: appConfig.notion.databaseId,
        filter: filters,
      });

      const pages = response.results.map((page: any) => ({
        id: page.id,
        properties: page.properties,
        content: '', // We'd need to fetch blocks separately for full content
      }));

      logger.info(`Fetched ${pages.length} pages from Notion`);
      return pages;
    } catch (error) {
      logger.error('Failed to query Notion database', error);
      throw error;
    }
  }

  /**
   * Create a new page
   */
  async createPage(properties: any, content?: string): Promise<string> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      const response = await this.client.pages.create({
        parent: { database_id: appConfig.notion.databaseId },
        properties,
        children: content ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content } }],
            },
          },
        ] : [],
      });

      logger.info(`Created Notion page: ${response.id}`);
      return response.id;
    } catch (error) {
      logger.error('Failed to create Notion page', error);
      throw error;
    }
  }

  /**
   * Create classification report page
   */
  async createClassificationReport(report: {
    title: string;
    totalProcessed: number;
    classified: number;
    accuracy: number;
    details: string;
  }): Promise<string> {
    const properties = {
      Name: {
        title: [
          {
            text: {
              content: report.title,
            },
          },
        ],
      },
      Type: {
        select: {
          name: 'Classification Report',
        },
      },
      Date: {
        date: {
          start: new Date().toISOString(),
        },
      },
    };

    return this.createPage(properties, report.details);
  }
}

export const notionService = new NotionService();

