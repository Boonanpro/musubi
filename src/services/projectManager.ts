/**
 * Musubi - Project Manager Service
 * 
 * Manages multiple projects and their evaluations
 */

import { Project, ProjectVersion, ProjectEvaluation, ProjectStats } from '../types/project.js';
import { Evaluation } from '../types/evaluation.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private versions: Map<string, ProjectVersion[]> = new Map();
  private evaluations: Map<string, ProjectEvaluation[]> = new Map();
  private currentProjectId: string | null = null;
  private dataDir: string;
  private dataFile: string;

  constructor() {
    // Setup data directory
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.dataFile = path.join(this.dataDir, 'projects.json');

    // Ensure data directory exists
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    // Load existing data or initialize defaults
    this.loadData();
  }

  /**
   * Load data from file
   */
  private loadData() {
    try {
      if (existsSync(this.dataFile)) {
        const data = JSON.parse(readFileSync(this.dataFile, 'utf-8'));
        
        // Restore projects
        this.projects = new Map(Object.entries(data.projects || {}));
        this.versions = new Map(Object.entries(data.versions || {}));
        this.evaluations = new Map(Object.entries(data.evaluations || {}));
        this.currentProjectId = data.currentProjectId || null;

        logger.info(`Loaded ${this.projects.size} projects from disk`);
      } else {
        // No saved data, initialize defaults
        this.initializeDefaultProjects();
        this.saveData();
      }
    } catch (error) {
      logger.error('Failed to load project data, initializing defaults', error);
      this.initializeDefaultProjects();
      this.saveData();
    }
  }

  /**
   * Save data to file
   */
  private saveData() {
    try {
      const data = {
        projects: Object.fromEntries(this.projects),
        versions: Object.fromEntries(this.versions),
        evaluations: Object.fromEntries(this.evaluations),
        currentProjectId: this.currentProjectId,
      };

      writeFileSync(this.dataFile, JSON.stringify(data, null, 2), 'utf-8');
      logger.info('Project data saved to disk');
    } catch (error) {
      logger.error('Failed to save project data', error);
    }
  }

  /**
   * Initialize default projects
   */
  private initializeDefaultProjects() {
    // Miyazaki - test project for Musubi self-improvement
    const miyazaki: Project = {
      id: 'miyazaki',
      name: 'Miyazaki AI',
      description: '画面収録映像生成AI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      status: 'active',
      tags: ['video', 'ai'],
      componentName: 'Miyazaki',
    };
    this.projects.set(miyazaki.id, miyazaki);

    // Initialize version 1.0.0 for Miyazaki
    this.versions.set(miyazaki.id, [{
      id: uuidv4(),
      projectId: miyazaki.id,
      version: '1.0.0',
      description: '初期バージョン - 画面収録とキャンバス加筆機能',
      createdAt: new Date().toISOString(),
      componentPath: 'src/components/Miyazaki.tsx',
      evaluationIds: [],
    }]);

    this.currentProjectId = 'miyazaki';
    logger.info('Initialized default project: Miyazaki AI (test case)');
  }

  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Get current project
   */
  getCurrentProject(): Project | null {
    if (!this.currentProjectId) return null;
    return this.projects.get(this.currentProjectId) || null;
  }

  /**
   * Set current project
   */
  setCurrentProject(projectId: string): boolean {
    if (!this.projects.has(projectId)) {
      logger.error(`Project not found: ${projectId}`);
      return false;
    }
    this.currentProjectId = projectId;
    
    // Save to disk
    this.saveData();
    
    logger.info(`Switched to project: ${projectId}`);
    return true;
  }

  /**
   * Create new project
   */
  createProject(
    name: string,
    description: string,
    tags: string[] = [],
    componentName?: string
  ): Project {
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      status: 'active',
      tags,
      componentName: componentName || name.replace(/\s+/g, ''),
    };

    this.projects.set(project.id, project);
    
    // Initialize first version
    const version: ProjectVersion = {
      id: uuidv4(),
      projectId: project.id,
      version: '1.0.0',
      description: '初期バージョン',
      createdAt: new Date().toISOString(),
      componentPath: `src/components/${project.componentName}.tsx`,
      evaluationIds: [],
    };
    this.versions.set(project.id, [version]);
    this.evaluations.set(project.id, []);

    // Save to disk
    this.saveData();

    logger.success(`Created project: ${name} (${project.id})`);
    return project;
  }

  /**
   * Update existing project
   */
  updateProject(project: Project): void {
    this.projects.set(project.id, project);
    
    // If componentName changed, update all versions' componentPath
    if (project.componentName) {
      const versions = this.versions.get(project.id) || [];
      versions.forEach(version => {
        version.componentPath = `src/components/${project.componentName}.tsx`;
      });
      this.versions.set(project.id, versions);
      logger.info(`Updated component paths for project: ${project.name} -> ${project.componentName}`);
    }
    
    // Save to disk
    this.saveData();
    
    logger.info(`Project updated: ${project.name} (${project.id})`);
  }

  /**
   * Delete project
   */
  deleteProject(projectId: string): boolean {
    if (!this.projects.has(projectId)) {
      logger.error(`Project not found: ${projectId}`);
      return false;
    }

    // Delete project
    this.projects.delete(projectId);
    
    // Delete associated data
    this.versions.delete(projectId);
    this.evaluations.delete(projectId);
    
    // If current project was deleted, switch to another
    if (this.currentProjectId === projectId) {
      const remainingProjects = Array.from(this.projects.keys());
      this.currentProjectId = remainingProjects.length > 0 ? remainingProjects[0] : null;
    }
    
    // Save to disk
    this.saveData();
    
    logger.info(`Project deleted: ${projectId}`);
    return true;
  }

  /**
   * Create new version for a project
   */
  createVersion(
    projectId: string,
    description: string,
    componentPath?: string
  ): ProjectVersion | null {
    const project = this.projects.get(projectId);
    if (!project) {
      logger.error(`Project not found: ${projectId}`);
      return null;
    }

    const projectVersions = this.versions.get(projectId) || [];
    const latestVersion = projectVersions[projectVersions.length - 1];
    
    // Increment version
    const [major, minor, patch] = (latestVersion?.version || '1.0.0').split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    const version: ProjectVersion = {
      id: uuidv4(),
      projectId,
      version: newVersion,
      description,
      createdAt: new Date().toISOString(),
      componentPath,
      evaluationIds: [],
    };

    projectVersions.push(version);
    this.versions.set(projectId, projectVersions);

    // Update project version
    project.version = newVersion;
    project.updatedAt = new Date().toISOString();

    // Save to disk
    this.saveData();

    logger.success(`Created version ${newVersion} for project ${projectId}`);
    return version;
  }

  /**
   * Add evaluation to project
   */
  addEvaluation(evaluation: Evaluation, projectId?: string): ProjectEvaluation {
    // Use provided projectId or fallback to currentProjectId or 'miyazaki'
    const targetProjectId = projectId || this.currentProjectId || 'miyazaki';
    const project = this.projects.get(targetProjectId);
    
    if (!project) {
      throw new Error(`Project not found: ${targetProjectId}`);
    }

    const projectVersions = this.versions.get(targetProjectId) || [];
    const currentVersion = projectVersions[projectVersions.length - 1];

    const projectEvaluation: ProjectEvaluation = {
      id: evaluation.id,
      projectId: targetProjectId,
      versionId: currentVersion?.id || 'unknown',
      score: evaluation.score,
      comments: evaluation.feedback.comments || '',
      timestamp: evaluation.timestamp,
      componentName: evaluation.componentName,
      filePath: evaluation.filePath,
    };

    const projectEvaluations = this.evaluations.get(targetProjectId) || [];
    projectEvaluations.push(projectEvaluation);
    this.evaluations.set(targetProjectId, projectEvaluations);

    // Add evaluation ID to version
    if (currentVersion) {
      currentVersion.evaluationIds.push(evaluation.id);
    }

    // Save to disk
    this.saveData();

    logger.info(`Added evaluation to project ${targetProjectId} version ${project.version}`);
    return projectEvaluation;
  }

  /**
   * Get evaluations for a project
   */
  getProjectEvaluations(projectId: string): ProjectEvaluation[] {
    return this.evaluations.get(projectId) || [];
  }

  /**
   * Get evaluations for a version
   */
  getVersionEvaluations(versionId: string): ProjectEvaluation[] {
    const allEvaluations: ProjectEvaluation[] = [];
    
    this.evaluations.forEach((evaluations) => {
      const versionEvals = evaluations.filter(e => e.versionId === versionId);
      allEvaluations.push(...versionEvals);
    });

    return allEvaluations;
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): ProjectStats | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const evaluations = this.evaluations.get(projectId) || [];
    const versions = this.versions.get(projectId) || [];

    if (evaluations.length === 0) {
      return {
        projectId,
        totalEvaluations: 0,
        averageScore: 0,
        latestScore: 0,
        scoreImprovement: 0,
        versions: versions.length,
      };
    }

    const scores = evaluations.map(e => e.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const latestScore = scores[scores.length - 1];
    const firstScore = scores[0];
    const scoreImprovement = latestScore - firstScore;

    return {
      projectId,
      totalEvaluations: evaluations.length,
      averageScore: Math.round(averageScore * 10) / 10,
      latestScore,
      scoreImprovement: Math.round(scoreImprovement * 10) / 10,
      versions: versions.length,
    };
  }

  /**
   * Get all project versions
   */
  getProjectVersions(projectId: string): ProjectVersion[] {
    return this.versions.get(projectId) || [];
  }

  /**
   * Analyze project improvement
   */
  analyzeImprovement(projectId: string): {
    trend: 'improving' | 'declining' | 'stable';
    analysis: string;
    recommendations: string[];
  } {
    const evaluations = this.evaluations.get(projectId) || [];
    
    if (evaluations.length < 2) {
      return {
        trend: 'stable',
        analysis: '評価データが不足しています。最低2回の評価が必要です。',
        recommendations: ['さらに評価を行ってください'],
      };
    }

    const scores = evaluations.map(e => e.score);
    const recentScores = scores.slice(-3);
    const olderScores = scores.slice(0, -3);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0 
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
      : recentScores[0];

    const improvement = recentAvg - olderAvg;

    let trend: 'improving' | 'declining' | 'stable';
    let analysis: string;
    const recommendations: string[] = [];

    if (improvement > 10) {
      trend = 'improving';
      analysis = `プロジェクトは大きく改善しています（+${improvement.toFixed(1)}点）。現在の方向性は正しいようです。`;
      recommendations.push('現在の改善方針を継続してください');
      recommendations.push('成功した変更を分析し、他の部分にも適用してください');
    } else if (improvement > 0) {
      trend = 'improving';
      analysis = `プロジェクトは緩やかに改善しています（+${improvement.toFixed(1)}点）。`;
      recommendations.push('改善ペースを加速させるため、より大きな変更を検討してください');
    } else if (improvement < -10) {
      trend = 'declining';
      analysis = `プロジェクトの品質が低下しています（${improvement.toFixed(1)}点）。最近の変更を見直す必要があります。`;
      recommendations.push('最近の変更をロールバックすることを検討してください');
      recommendations.push('低評価の原因を詳しく分析してください');
    } else if (improvement < 0) {
      trend = 'declining';
      analysis = `プロジェクトがわずかに悪化しています（${improvement.toFixed(1)}点）。`;
      recommendations.push('最近の変更を見直してください');
    } else {
      trend = 'stable';
      analysis = 'プロジェクトは安定していますが、改善の余地があります。';
      recommendations.push('新しい機能や改善を試してください');
      recommendations.push('ユーザーフィードバックを詳しく分析してください');
    }

    return { trend, analysis, recommendations };
  }
}

export const projectManager = new ProjectManager();

