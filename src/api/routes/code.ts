/**
 * Musubi - Code API Routes
 * 
 * Endpoints for code generation and execution
 */

import { Router } from 'express';
import { codeGenerator } from '../../services/codeGenerator.js';
import { actionManager } from '../../services/actionManager.js';
import { logger } from '../../utils/logger.js';

export const codeRouter = Router();

/**
 * POST /api/code/generate
 * Generate code from user request
 */
codeRouter.post('/generate', async (req, res) => {
  try {
    const { request, context, conversationHistory } = req.body;

    if (!request) {
      return res.status(400).json({ error: 'Request is required' });
    }

    logger.info(`Code generation request: ${request.substring(0, 50)}...`);

    const actions = await codeGenerator.generateCode(
      request,
      context,
      conversationHistory
    );

    // Add actions to manager
    actions.forEach(action => actionManager.addAction(action));

    res.json({
      success: true,
      actions: actions.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        status: a.status,
        details: a.details,
      })),
      message: `Generated ${actions.length} action(s). Please review and approve.`,
    });

  } catch (error) {
    logger.error('Code generation failed', error);
    res.status(500).json({ 
      error: 'Code generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/code/actions
 * Get all pending actions
 */
codeRouter.get('/actions', async (req, res) => {
  try {
    const pendingActions = actionManager.getPendingActions();

    res.json({
      success: true,
      actions: pendingActions.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        status: a.status,
        timestamp: a.timestamp,
        details: a.details,
      })),
    });

  } catch (error) {
    logger.error('Failed to fetch actions', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

/**
 * GET /api/code/actions/:id
 * Get specific action
 */
codeRouter.get('/actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const action = actionManager.getAction(id);

    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    res.json({
      success: true,
      action: {
        id: action.id,
        type: action.type,
        description: action.description,
        status: action.status,
        timestamp: action.timestamp,
        details: action.details,
        result: action.result,
        error: action.error,
      },
    });

  } catch (error) {
    logger.error('Failed to fetch action', error);
    res.status(500).json({ error: 'Failed to fetch action' });
  }
});

/**
 * POST /api/code/actions/:id/approve
 * Approve a pending action
 */
codeRouter.post('/actions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const approved = actionManager.approveAction(id);

    if (!approved) {
      return res.status(400).json({ error: 'Cannot approve action' });
    }

    res.json({
      success: true,
      message: 'Action approved',
    });

  } catch (error) {
    logger.error('Failed to approve action', error);
    res.status(500).json({ error: 'Failed to approve action' });
  }
});

/**
 * POST /api/code/actions/:id/reject
 * Reject a pending action
 */
codeRouter.post('/actions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejected = actionManager.rejectAction(id, reason);

    if (!rejected) {
      return res.status(400).json({ error: 'Cannot reject action' });
    }

    res.json({
      success: true,
      message: 'Action rejected',
    });

  } catch (error) {
    logger.error('Failed to reject action', error);
    res.status(500).json({ error: 'Failed to reject action' });
  }
});

/**
 * POST /api/code/actions/:id/execute
 * Execute an approved action
 */
codeRouter.post('/actions/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;

      const result = await actionManager.executeAction(id);

      if (!result.success) {
        return res.status(400).json({ 
          error: 'Execution failed',
          details: result.error,
        });
      }

      // Check if this is a component creation - generate preview URL
      const action = actionManager.getAction(id);
      let previewUrl: string | undefined;
      let componentName: string | undefined;
      let filePath: string | undefined;
      
      if (action && (action.type === 'file_create' || action.type === 'file_edit')) {
        const details = action.details as any;
        filePath = details.path;
        
        // Check if it's a React component in src/components
        if (filePath && filePath.includes('src/components/') && (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))) {
          componentName = filePath.split('/').pop()?.replace(/\.(tsx|jsx)$/, '');
          if (componentName) {
            previewUrl = `http://localhost:3003/preview/${componentName}`;
          }
        }
      }

      res.json({
        success: true,
        result: result.result,
        message: 'Action executed successfully',
        previewUrl,
        componentName,
        filePath,
        actionId: id,
      });

  } catch (error) {
    logger.error('Failed to execute action', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

/**
 * POST /api/code/file/read
 * Read a file
 */
codeRouter.post('/file/read', async (req, res) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const content = actionManager.readFile(path);

    res.json({
      success: true,
      path,
      content,
    });

  } catch (error) {
    logger.error('Failed to read file', error);
    res.status(500).json({ 
      error: 'Failed to read file',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/code/actions/cleanup
 * Clean up completed actions
 */
codeRouter.delete('/actions/cleanup', async (req, res) => {
  try {
    actionManager.cleanup();

    res.json({
      success: true,
      message: 'Cleanup completed',
    });

  } catch (error) {
    logger.error('Failed to cleanup actions', error);
    res.status(500).json({ error: 'Failed to cleanup actions' });
  }
});

