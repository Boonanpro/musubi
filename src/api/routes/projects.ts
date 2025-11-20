/**
 * Musubi - Projects API Routes
 */

import { Router } from 'express';
import { projectManager } from '../../services/projectManager.js';
import { logger } from '../../utils/logger.js';

export const projectsRouter = Router();

/**
 * GET /api/projects
 * Get all projects
 */
projectsRouter.get('/', (req, res) => {
  try {
    const projects = projectManager.getAllProjects();
    
    res.json({
      success: true,
      projects,
      current: projectManager.getCurrentProject(),
    });
  } catch (error) {
    logger.error('Failed to get projects', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects/:projectId
 * Get project details
 */
projectsRouter.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projectManager.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const versions = projectManager.getProjectVersions(projectId);
    const evaluations = projectManager.getProjectEvaluations(projectId);
    const stats = projectManager.getProjectStats(projectId);
    const improvement = projectManager.analyzeImprovement(projectId);

    res.json({
      success: true,
      project,
      versions,
      evaluations,
      stats,
      improvement,
    });
  } catch (error) {
    logger.error('Failed to get project details', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
projectsRouter.post('/', (req, res) => {
  try {
    const { name, description, tags, componentName } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Project name is required',
      });
    }

    const project = projectManager.createProject(
      name, 
      description || '', 
      tags || [], 
      componentName
    );

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    logger.error('Failed to create project', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/projects/:projectId
 * Update project details
 */
projectsRouter.patch('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { componentName, name, description } = req.body;

    const project = projectManager.getProject(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Update fields
    if (componentName !== undefined) project.componentName = componentName;
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    project.updatedAt = new Date().toISOString();

    // Save changes to disk
    projectManager.updateProject(project);

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    logger.error('Failed to update project', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete project
 */
projectsRouter.delete('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;

    const success = projectManager.deleteProject(projectId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete project', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/projects/:projectId/switch
 * Switch to project
 */
projectsRouter.put('/:projectId/switch', (req, res) => {
  try {
    const { projectId } = req.params;
    const success = projectManager.setCurrentProject(projectId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      project: projectManager.getCurrentProject(),
    });
  } catch (error) {
    logger.error('Failed to switch project', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/projects/:projectId/versions
 * Create new version
 */
projectsRouter.post('/:projectId/versions', (req, res) => {
  try {
    const { projectId } = req.params;
    const { description, componentPath } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Version description is required',
      });
    }

    const version = projectManager.createVersion(projectId, description, componentPath);

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      version,
    });
  } catch (error) {
    logger.error('Failed to create version', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects/:projectId/stats
 * Get project statistics
 */
projectsRouter.get('/:projectId/stats', (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = projectManager.getProjectStats(projectId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get project stats', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects/:projectId/improvement
 * Get improvement analysis
 */
projectsRouter.get('/:projectId/improvement', (req, res) => {
  try {
    const { projectId } = req.params;
    const improvement = projectManager.analyzeImprovement(projectId);

    res.json({
      success: true,
      improvement,
    });
  } catch (error) {
    logger.error('Failed to analyze improvement', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

