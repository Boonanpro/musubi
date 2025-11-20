/**
 * Auto Information Gatherer (Step 3)
 * Musubiが自動で情報を収集するシステム
 * - Web検索
 * - GitHub検索
 * - npm パッケージ検索
 */

import { logger } from '../utils/logger.js';

export interface GatheredInfo {
  source: 'web' | 'github' | 'npm' | 'docs';
  title: string;
  url: string;
  snippet: string;
  relevance: number; // 0-1
  timestamp: string;
}

export interface InfoGatheringResult {
  query: string;
  results: GatheredInfo[];
  totalFound: number;
  gatheringTime: number; // ms
}

class AutoInfoGatherer {
  /**
   * Gather information about a requirement
   */
  async gatherInfo(requirement: string): Promise<InfoGatheringResult> {
    const startTime = Date.now();
    logger.info(`[AutoInfoGatherer] Gathering info for: "${requirement.substring(0, 50)}..."`);

    const results: GatheredInfo[] = [];

    // Parallel gathering
    const [webResults, githubResults, npmResults] = await Promise.all([
      this.searchWeb(requirement),
      this.searchGitHub(requirement),
      this.searchNpm(requirement),
    ]);

    results.push(...webResults, ...githubResults, ...npmResults);

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    const gatheringTime = Date.now() - startTime;

    logger.info(
      `[AutoInfoGatherer] Gathered ${results.length} results in ${gatheringTime}ms ` +
      `(web: ${webResults.length}, github: ${githubResults.length}, npm: ${npmResults.length})`
    );

    return {
      query: requirement,
      results: results.slice(0, 20), // Top 20
      totalFound: results.length,
      gatheringTime,
    };
  }

  /**
   * Search web for implementation examples
   * TODO: Integrate with actual search API (Perplexity, Google Custom Search, etc.)
   */
  private async searchWeb(query: string): Promise<GatheredInfo[]> {
    try {
      // For now, return simulated results
      // In production, integrate with search API
      logger.info('[AutoInfoGatherer] Web search not yet implemented, returning simulated results');

      const keywords = this.extractKeywords(query);
      
      return [
        {
          source: 'web',
          title: `${keywords[0]} の実装方法 - Qiita`,
          url: `https://qiita.com/search?q=${encodeURIComponent(keywords.join(' '))}`,
          snippet: 'Web検索APIの統合が必要です。Perplexity API、Google Custom Search API、Brave Search API等を検討してください。',
          relevance: 0.6,
          timestamp: new Date().toISOString(),
        },
      ];
    } catch (error) {
      logger.error('[AutoInfoGatherer] Web search failed', error);
      return [];
    }
  }

  /**
   * Search GitHub for similar implementations
   */
  private async searchGitHub(query: string): Promise<GatheredInfo[]> {
    try {
      // GitHub API integration
      // For now, return simulated results
      logger.info('[AutoInfoGatherer] GitHub search not yet implemented, returning simulated results');

      const keywords = this.extractKeywords(query);
      
      return [
        {
          source: 'github',
          title: `GitHub検索: ${keywords[0]}`,
          url: `https://github.com/search?q=${encodeURIComponent(keywords.join(' '))}`,
          snippet: 'GitHub APIの統合が必要です。Personal Access Tokenを設定してください。',
          relevance: 0.7,
          timestamp: new Date().toISOString(),
        },
      ];
    } catch (error) {
      logger.error('[AutoInfoGatherer] GitHub search failed', error);
      return [];
    }
  }

  /**
   * Search npm for relevant packages
   */
  private async searchNpm(query: string): Promise<GatheredInfo[]> {
    try {
      // npm registry API
      const keywords = this.extractKeywords(query);
      const searchQuery = keywords.join(' ');
      
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=5`
      );
      
      if (!response.ok) {
        throw new Error(`npm search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.objects.map((obj: any) => ({
        source: 'npm' as const,
        title: obj.package.name,
        url: obj.package.links.npm,
        snippet: obj.package.description || 'No description',
        relevance: obj.score.final,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('[AutoInfoGatherer] npm search failed', error);
      return [];
    }
  }

  /**
   * Extract keywords from requirement
   */
  private extractKeywords(text: string): string[] {
    // Remove common words
    const stopWords = ['の', 'を', 'に', 'は', 'が', 'で', 'と', 'から', 'まで', 'する', 'ある', 'いる', 'できる'];
    
    const words = text
      .toLowerCase()
      .split(/[\s、。！？]+/)
      .filter(w => w.length > 1 && !stopWords.includes(w))
      .slice(0, 5);
    
    return words;
  }

  /**
   * Check if API/library exists
   */
  async checkApiExists(apiName: string): Promise<{
    exists: boolean;
    source: string;
    documentation?: string;
  }> {
    logger.info(`[AutoInfoGatherer] Checking if API exists: ${apiName}`);

    // Check npm
    try {
      const response = await fetch(`https://registry.npmjs.org/${apiName}`);
      if (response.ok) {
        const data = await response.json();
        return {
          exists: true,
          source: 'npm',
          documentation: data.homepage || `https://www.npmjs.com/package/${apiName}`,
        };
      }
    } catch (error) {
      // Continue to next check
    }

    // Check if it's a known API
    const knownApis: { [key: string]: string } = {
      'notion': 'https://developers.notion.com/',
      'line': 'https://developers.line.biz/ja/docs/messaging-api/',
      'openai': 'https://platform.openai.com/docs/',
      'anthropic': 'https://docs.anthropic.com/',
      'supabase': 'https://supabase.com/docs',
      'perplexity': 'https://docs.perplexity.ai/',
    };

    const lowerName = apiName.toLowerCase();
    for (const [key, url] of Object.entries(knownApis)) {
      if (lowerName.includes(key)) {
        return {
          exists: true,
          source: 'known-api',
          documentation: url,
        };
      }
    }

    return {
      exists: false,
      source: 'unknown',
    };
  }

  /**
   * Gather implementation examples
   */
  async gatherImplementationExamples(
    requirement: string,
    technology: string
  ): Promise<GatheredInfo[]> {
    logger.info(`[AutoInfoGatherer] Gathering examples for: ${technology}`);

    const query = `${technology} ${requirement} implementation example`;
    const info = await this.gatherInfo(query);
    
    return info.results.filter(r => r.relevance > 0.5);
  }
}

export const autoInfoGatherer = new AutoInfoGatherer();

