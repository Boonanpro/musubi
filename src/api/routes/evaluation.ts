/**
 * Musubi - Evaluation API Routes
 * 
 * Endpoints for evaluating generated code and analyzing data quality
 */

import { Router } from 'express';
import { evaluationManager } from '../../services/evaluationManager.js';
import { logger } from '../../utils/logger.js';
import { SourceDataInfo, EvaluationFeedback } from '../../types/evaluation.js';

export const evaluationRouter = Router();

/**
 * POST /api/evaluation
 * Submit an evaluation
 */
evaluationRouter.post('/', async (req, res) => {
  try {
    const { projectId, actionId, componentName, filePath, score, feedback, sourceData } = req.body;

    if (!actionId || !componentName || !filePath || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' });
    }

    const evaluation = evaluationManager.addEvaluation(
      actionId,
      componentName,
      filePath,
      score,
      feedback as EvaluationFeedback,
      sourceData as SourceDataInfo,
      projectId
    );

    logger.success(`Evaluation submitted: ${componentName} (${projectId}) - ${score} points`);

    res.json({
      success: true,
      evaluation,
      message: '評価を記録しました',
    });

  } catch (error) {
    logger.error('Evaluation submission failed', error);
    res.status(500).json({ 
      error: 'Failed to submit evaluation',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/evaluation/stats
 * Get evaluation statistics
 */
evaluationRouter.get('/stats', async (req, res) => {
  try {
    const stats = evaluationManager.getStats();

    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    logger.error('Failed to get stats', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/evaluation/analysis
 * Get full analysis including correlations and recommendations
 */
evaluationRouter.get('/analysis', async (req, res) => {
  try {
    const analysis = evaluationManager.getAnalysis();

    res.json({
      success: true,
      analysis,
    });

  } catch (error) {
    logger.error('Failed to get analysis', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

/**
 * GET /api/evaluation/recommendations
 * Get data quality recommendations
 */
evaluationRouter.get('/recommendations', async (req, res) => {
  try {
    const recommendations = evaluationManager.generateRecommendations();

    res.json({
      success: true,
      recommendations,
    });

  } catch (error) {
    logger.error('Failed to get recommendations', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * GET /api/evaluation/list
 * Get all evaluations
 */
evaluationRouter.get('/list', async (req, res) => {
  try {
    const evaluations = evaluationManager.getAllEvaluations();

    res.json({
      success: true,
      evaluations,
      total: evaluations.length,
    });

  } catch (error) {
    logger.error('Failed to get evaluations', error);
    res.status(500).json({ error: 'Failed to get evaluations' });
  }
});

/**
 * GET /api/evaluation/:id
 * Get specific evaluation
 */
evaluationRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evaluation = evaluationManager.getEvaluation(id);

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    res.json({
      success: true,
      evaluation,
    });

  } catch (error) {
    logger.error('Failed to get evaluation', error);
    res.status(500).json({ error: 'Failed to get evaluation' });
  }
});

