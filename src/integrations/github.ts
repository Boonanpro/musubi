/**
 * Musubi - GitHub Integration
 */

import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface CreateRepositoryOptions {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
  license?: string;
  gitignoreTemplate?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
}

export class GitHubService {
  private baseUrl = 'https://api.github.com';
  private token: string | null = null;

  /**
   * Initialize GitHub client
   */
  async connect(): Promise<boolean> {
    try {
      if (!appConfig.github?.token) {
        throw new Error('GitHub token not configured');
      }

      this.token = appConfig.github.token;

      // Test connection by getting authenticated user
      // Support both classic and fine-grained tokens
      const authHeader = this.token.startsWith('github_pat_') 
        ? `Bearer ${this.token}`
        : `token ${this.token}`;
      
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const user = await response.json();
      logger.success(`GitHub connected successfully as ${user.login}`);
      return true;
    } catch (error) {
      logger.error('Failed to connect to GitHub', error);
      return false;
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(options: CreateRepositoryOptions): Promise<Repository> {
    if (!this.token) {
      throw new Error('GitHub client not initialized. Call connect() first.');
    }

    try {
      const body: any = {
        name: options.name,
        description: options.description || '',
        private: options.private ?? false,
        auto_init: options.autoInit ?? true,
      };

      if (options.license) {
        body.license_template = options.license;
      }

      if (options.gitignoreTemplate) {
        body.gitignore_template = options.gitignoreTemplate;
      }

      // Support both classic and fine-grained tokens
      // Classic tokens start with ghp_, fine-grained tokens start with github_pat_
      const authHeader = this.token.startsWith('github_pat_') 
        ? `Bearer ${this.token}`
        : this.token.startsWith('ghp_')
        ? `token ${this.token}`
        : `Bearer ${this.token}`;
      
      const response = await fetch(`${this.baseUrl}/user/repos`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error: any;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { message: errorText || response.statusText };
        }
        
        const errorMessage = error.message || error.error || response.statusText;
        const errorDetails = error.errors ? JSON.stringify(error.errors) : '';
        const fullError = `Failed to create repository: ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`;
        
        logger.error(`GitHub API Error (${response.status}):`, {
          status: response.status,
          statusText: response.statusText,
          error: error,
          url: `${this.baseUrl}/user/repos`,
        });
        throw new Error(fullError);
      }

      const repo = await response.json();
      logger.success(`Repository created: ${repo.html_url}`);

      return {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
      };
    } catch (error) {
      logger.error('Failed to create repository', error);
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<Repository | null> {
    if (!this.token) {
      throw new Error('GitHub client not initialized. Call connect() first.');
    }

    try {
      // Support both classic and fine-grained tokens
      const authHeader = this.token.startsWith('github_pat_') 
        ? `Bearer ${this.token}`
        : `token ${this.token}`;
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repoData = await response.json();
      return {
        id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        private: repoData.private,
        html_url: repoData.html_url,
        clone_url: repoData.clone_url,
        ssh_url: repoData.ssh_url,
      };
    } catch (error) {
      logger.error('Failed to get repository', error);
      throw error;
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    const repoData = await this.getRepository(owner, repo);
    return repoData !== null;
  }
}

export const githubService = new GitHubService();

