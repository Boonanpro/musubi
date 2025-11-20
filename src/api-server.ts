/**
 * Musubi API Server Entry Point
 */

import { startServer } from './api/server.js';
import { startPreviewServer } from './services/previewServer.js';
import { startSharedWebSocketServer } from './services/sharedWebSocketServer.js';
import { logger } from './utils/logger.js';

logger.section('🌟 Musubi API Server');
logger.info('Starting...');

// Start shared WebSocket server (for all projects)
startSharedWebSocketServer();

// Start API server
startServer();

// Start preview server
startPreviewServer();

logger.info('✅ Musubi API Server ready');

