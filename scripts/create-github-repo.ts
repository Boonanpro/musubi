/**
 * Musubi - GitHub Repository Creation Script
 * 
 * This script creates a GitHub repository for Musubi and sets up the initial commit.
 */

import { githubService } from '../src/integrations/github.js';
import { logger } from '../src/utils/logger.js';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface CreateRepoOptions {
  name: string;
  description?: string;
  private?: boolean;
  skipCommit?: boolean;
}

async function createGitHubRepository(options: CreateRepoOptions) {
  try {
    logger.section('🌟 Creating GitHub Repository');

    // Connect to GitHub
    logger.info('Connecting to GitHub...');
    const connected = await githubService.connect();
    if (!connected) {
      throw new Error('Failed to connect to GitHub. Please check your GITHUB_TOKEN.');
    }

    // Check if repository already exists
    const currentUser = await getCurrentUser();
    const exists = await githubService.repositoryExists(currentUser, options.name);
    
    if (exists) {
      logger.warn(`Repository ${currentUser}/${options.name} already exists.`);
      logger.info(`Repository URL: https://github.com/${currentUser}/${options.name}`);
      
      // Set remote if not already set
      await setupRemote(currentUser, options.name);
      return;
    }

    // Create repository
    logger.info(`Creating repository: ${options.name}...`);
    const repo = await githubService.createRepository({
      name: options.name,
      description: options.description || 'Musubi - ゼロパーソンカンパニーOS',
      private: options.private ?? false,
      autoInit: false,
      license: 'mit',
      gitignoreTemplate: 'Node',
    });

    logger.success(`Repository created: ${repo.html_url}`);

    // Setup git remote and push
    if (!options.skipCommit) {
      await setupRemote(currentUser, options.name);
      await initialCommitAndPush();
    }

    logger.success('\n✅ GitHub repository setup complete!');
    logger.info(`Repository URL: ${repo.html_url}`);
    logger.info(`Clone URL: ${repo.clone_url}`);

  } catch (error) {
    logger.error('Failed to create GitHub repository', error);
    process.exit(1);
  }
}

async function getCurrentUser(): Promise<string> {
  try {
    const token = process.env.GITHUB_TOKEN || '';
    const authHeader = token.startsWith('github_pat_') 
      ? `Bearer ${token}`
      : `token ${token}`;
    
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const user = await response.json();
    return user.login;
  } catch (error) {
    logger.error('Failed to get current user', error);
    throw error;
  }
}

async function setupRemote(owner: string, repo: string) {
  try {
    logger.info('Setting up git remote...');
    
    // Check if remote already exists
    try {
      const existingRemote = execSync('git remote get-url origin', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      logger.info(`Remote already exists: ${existingRemote}`);
      
      // Update remote URL if different
      const expectedUrl = `https://github.com/${owner}/${repo}.git`;
      if (existingRemote !== expectedUrl && !existingRemote.includes(`${owner}/${repo}`)) {
        logger.info('Updating remote URL...');
        execSync(`git remote set-url origin ${expectedUrl}`, { stdio: 'inherit' });
      }
    } catch {
      // Remote doesn't exist, add it
      logger.info('Adding git remote...');
      execSync(`git remote add origin https://github.com/${owner}/${repo}.git`, { stdio: 'inherit' });
    }
  } catch (error) {
    logger.error('Failed to setup remote', error);
    throw error;
  }
}

async function initialCommitAndPush() {
  try {
    logger.info('Preparing initial commit...');

    // Check if .git directory exists
    const gitDir = resolve(process.cwd(), '.git');
    if (!existsSync(gitDir)) {
      logger.info('Initializing git repository...');
      execSync('git init', { stdio: 'inherit' });
    }

    // Check if there are any changes to commit
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      if (!status.trim()) {
        logger.info('No changes to commit. Checking if initial commit exists...');
        try {
          execSync('git rev-parse --verify HEAD', { stdio: 'pipe' });
          logger.info('Repository already has commits.');
        } catch {
          // No commits yet, create initial commit
          logger.info('Creating initial commit...');
          execSync('git add .', { stdio: 'inherit' });
          execSync('git commit -m "Initial commit: Musubi - ゼロパーソンカンパニーOS"', { stdio: 'inherit' });
        }
      } else {
        logger.info('Staging changes...');
        execSync('git add .', { stdio: 'inherit' });
        
        logger.info('Creating initial commit...');
        execSync('git commit -m "Initial commit: Musubi - ゼロパーソンカンパニーOS"', { stdio: 'inherit' });
      }
    } catch (error) {
      logger.warn('Git status check failed, proceeding with commit...');
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "Initial commit: Musubi - ゼロパーソンカンパニーOS"', { stdio: 'inherit' });
    }

    // Push to GitHub
    logger.info('Pushing to GitHub...');
    try {
      execSync('git push -u origin main', { stdio: 'inherit' });
    } catch {
      // Try master branch if main doesn't work
      try {
        execSync('git branch -M main', { stdio: 'inherit' });
        execSync('git push -u origin main', { stdio: 'inherit' });
      } catch {
        execSync('git push -u origin master', { stdio: 'inherit' });
      }
    }

    logger.success('Code pushed to GitHub successfully!');
  } catch (error) {
    logger.error('Failed to commit and push', error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);
const name = args[0] || 'musubi';
const description = args[1] || 'Musubi - ゼロパーソンカンパニーOS';
const isPrivate = args.includes('--private');

createGitHubRepository({
  name,
  description,
  private: isPrivate,
});

