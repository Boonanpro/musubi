/**
 * Musubi - File Reading Utilities
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import iconv from 'iconv-lite';
import { logger } from './logger.js';
import { ConversationLog } from '../types/index.js';

/**
 * Read and parse log file
 */
export function readLogFile(filePath: string): ConversationLog[] {
  try {
    if (!existsSync(filePath)) {
      logger.warn(`Log file not found: ${filePath}`);
      return [];
    }

    // Read file with UTF-8 encoding
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const conversations: ConversationLog[] = [];
    
    for (const line of lines) {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(line);
        conversations.push({
          id: parsed.id || generateId(),
          timestamp: parsed.timestamp || new Date().toISOString(),
          content: parsed.content || parsed.message || line,
          project: parsed.project,
        });
      } catch {
        // If not JSON, treat as plain text
        conversations.push({
          id: generateId(),
          timestamp: new Date().toISOString(),
          content: line,
        });
      }
    }

    logger.info(`Read ${conversations.length} conversations from ${filePath}`);
    return conversations;
  } catch (error) {
    logger.error(`Failed to read log file: ${filePath}`, error);
    return [];
  }
}

/**
 * Read uncategorized logs
 */
export function readUncategorizedLogs(basePath: string): ConversationLog[] {
  const uncategorizedPath = join(basePath, 'logs', 'uncategorized', 'uncategorized-dev.log');
  return readLogFile(uncategorizedPath);
}

/**
 * Read all project logs
 */
export function readProjectLogs(basePath: string, projects: string[]): Map<string, ConversationLog[]> {
  const projectLogs = new Map<string, ConversationLog[]>();

  for (const project of projects) {
    const logPath = join(basePath, 'logs', project, `${project}-dev.log`);
    const logs = readLogFile(logPath);
    projectLogs.set(project, logs);
  }

  return projectLogs;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string): string[] {
  // Simple keyword extraction - can be improved with NLP
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
    'in', 'with', 'to', 'for', 'of', 'as', 'by', 'from', 'that',
    'が', 'を', 'に', 'は', 'の', 'で', 'と', 'も', 'や', 'から',
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const keywords1 = new Set(extractKeywords(text1));
  const keywords2 = new Set(extractKeywords(text2));

  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

