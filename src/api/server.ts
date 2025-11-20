/**
 * Musubi - API Server
 */

import express from 'express';
import cors from 'cors';
import { logger } from '../utils/logger.js';
import { appConfig } from '../config/index.js';
import { chatRouter } from './routes/chat.js';
import { dataRouter } from './routes/data.js';
import { codeRouter } from './routes/code.js';
import { evaluationRouter } from './routes/evaluation.js';
import { projectsRouter } from './routes/projects.js';
import { developmentRouter } from './routes/development.js';
import { analysisRouter } from './routes/analysis.js';
import musubiProjectsRouter from './routes/musubi-dev.js';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/data', dataRouter);
app.use('/api/code', codeRouter);
app.use('/api/evaluation', evaluationRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/development', developmentRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/musubi', musubiProjectsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Musubi API is running' });
});

// Start server
export function startServer() {
  app.listen(PORT, () => {
    logger.success(`Musubi API Server running on http://localhost:${PORT}`);
    
    // Log configuration status
    const hasAnthropicKey = appConfig.anthropic.apiKey && appConfig.anthropic.apiKey.length > 0;
    const hasSupabaseConfig = appConfig.supabase.url && appConfig.supabase.key;
    
    logger.info(`[Config] Anthropic API Key: ${hasAnthropicKey ? `✓ (${appConfig.anthropic.apiKey.substring(0, 10)}...)` : '✗ Not configured'}`);
    logger.info(`[Config] Supabase: ${hasSupabaseConfig ? '✓ Configured' : '✗ Not configured'}`);
  });
}

