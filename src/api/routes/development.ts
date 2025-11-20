/**
 * Development API Routes
 * 
 * Endpoints for iterative development process
 */

import { Router } from 'express';
import { iterativeDevelopmentService } from '../../services/iterativeDevelopment.js';
import { logger } from '../../utils/logger.js';

export const developmentRouter = Router();

/**
 * POST /api/development/start
 * Start iterative development process
 */
developmentRouter.post('/start', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    logger.info('Starting iterative development...');

    // Set SSE headers for real-time progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate temporary project ID
    const projectId = `temp-${Date.now()}`;

    // Start development with progress callback
    iterativeDevelopmentService.startDevelopment(
      projectId,
      description,
      (plan, thinkingLog) => {
        // Send detailed progress update via SSE
        const currentStep = plan.steps[plan.currentStep];
        let detailedPhase = currentStep?.phase || '処理中...';
        
        // Add status-specific details
        if (currentStep) {
          if (currentStep.status === 'in_progress') {
            if (plan.currentStep === 0) {
              detailedPhase = `🧠 ${currentStep.phase}を分析しています...`;
            } else {
              detailedPhase = `✍️ ${currentStep.phase}をコーディングしています...`;
            }
          } else if (currentStep.status === 'completed') {
            detailedPhase = `✅ ${currentStep.phase}が完成`;
          }
        }

        res.write(`data: ${JSON.stringify({
          type: 'progress',
          plan: {
            projectName: plan.projectName,
            currentStep: plan.currentStep,
            totalSteps: plan.steps.length,
            status: plan.status,
            detailedPhase,
            thinkingLog: thinkingLog || '',  // AI思考ログ
            steps: plan.steps.map(s => ({
              phase: s.phase,
              description: s.description,
              status: s.status,
            })),
          },
        })}\n\n`);
      }
    ).then((completedPlan) => {
      // Send completion event
      res.write(`data: ${JSON.stringify({
        type: 'completed',
        plan: {
          projectName: completedPlan.projectName,
          componentPath: completedPlan.steps[completedPlan.steps.length - 1]?.componentPath,
        },
      })}\n\n`);

      res.end();
      logger.success('Development completed');
    }).catch((error) => {
      // Send error event
      logger.error('Development failed', error);
      const plan = iterativeDevelopmentService.getPlan(projectId);
      
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
        plan: plan ? {
          projectName: plan.projectName,
          currentStep: plan.currentStep + 1,
          totalSteps: plan.steps.length,
        } : null,
      })}\n\n`);

      res.end();
    });

  } catch (error) {
    logger.error('Failed to start development', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

/**
 * GET /api/development/status/:projectId
 * Get development status
 */
developmentRouter.get('/status/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const plan = iterativeDevelopmentService.getPlan(projectId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Development plan not found',
      });
    }

    res.json({
      success: true,
      plan: {
        projectName: plan.projectName,
        currentStep: plan.currentStep,
        totalSteps: plan.steps.length,
        status: plan.status,
        steps: plan.steps,
      },
    });
  } catch (error) {
    logger.error('Failed to get development status', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/development/plans
 * Get all active development plans
 */
developmentRouter.get('/plans', (_req, res) => {
  try {
    const plans = iterativeDevelopmentService.getAllPlans();

    res.json({
      success: true,
      plans: plans.map(p => ({
        projectName: p.projectName,
        currentStep: p.currentStep,
        totalSteps: p.steps.length,
        status: p.status,
      })),
    });
  } catch (error) {
    logger.error('Failed to get development plans', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

