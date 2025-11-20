/**
 * Musubi - Autonomous AI Developer System
 * Main Entry Point
 */

import { appConfig, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { supabaseService } from './integrations/supabase.js';
import { notionService } from './integrations/notion.js';
import { anthropicService } from './integrations/anthropic.js';
import { readUncategorizedLogs } from './utils/fileReader.js';
import { LogClassifier } from './classifiers/logClassifier.js';
import { Reporter } from './utils/reporter.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Main execution
 */
async function main() {
  logger.section('🌟 Musubi - Autonomous AI Developer System');
  logger.info('Starting up...');

  // Validate configuration
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    logger.error('Configuration validation failed:');
    configValidation.errors.forEach(error => logger.error(`  - ${error}`));
    
    logger.warn('\nSome services may not be available. Continuing with limited functionality...');
  }

  // Test connections
  logger.section('Testing Connections');
  
  const connections = {
    supabase: false,
    notion: false,
    anthropic: false,
  };

  if (appConfig.supabase.url && appConfig.supabase.key) {
    connections.supabase = await supabaseService.connect();
  } else {
    logger.warn('Supabase credentials not configured, skipping connection test');
  }

  if (appConfig.notion.apiKey) {
    connections.notion = await notionService.connect();
  } else {
    logger.warn('Notion API key not configured, skipping connection test');
  }

  if (appConfig.anthropic.apiKey) {
    connections.anthropic = await anthropicService.connect();
  } else {
    logger.warn('Anthropic API key not configured, skipping AI classification');
  }

  // Phase 1: Uncategorized Log Classification
  logger.section('Phase 1: Uncategorized Log Classification');

  // Read uncategorized logs
  logger.info('Reading uncategorized logs...');
  const allLogs = readUncategorizedLogs(appConfig.cheki.basePath);
  
  if (allLogs.length === 0) {
    logger.warn('No uncategorized logs found. Nothing to classify.');
    logger.info(`Expected path: ${join(appConfig.cheki.basePath, 'logs', 'uncategorized', 'uncategorized-dev.log')}`);
    return;
  }

  logger.success(`Found ${allLogs.length} uncategorized conversations`);
  
  // For initial testing, process only a sample (first 100)
  const SAMPLE_SIZE = 100;
  const uncategorizedLogs = allLogs.slice(0, SAMPLE_SIZE);
  logger.info(`Processing sample of ${uncategorizedLogs.length} conversations for quick testing`);
  logger.info(`(To process all ${allLogs.length}, change SAMPLE_SIZE in src/index.ts)`);

  // Prepare projects for classification
  const projects = appConfig.cheki.projects.map(p => ({
    name: p.name,
    keywords: p.keywords,
    patterns: [], // Can be extended with regex patterns
    logPath: join(appConfig.cheki.basePath, p.logFile),
  }));

  // Create classifier
  const useAI = connections.anthropic;
  const classifier = new LogClassifier(projects, useAI);

  // Classify logs
  logger.info(`Classification method: ${useAI ? 'Hybrid (keywords + AI)' : 'Keyword-based only'}`);
  
  let results;
  if (useAI) {
    // Use hybrid approach: keywords first, then AI for low confidence
    results = await classifier.classifyHybrid(uncategorizedLogs, 0.6);
  } else {
    // Use keyword-based only
    results = await classifier.classifyBatch(uncategorizedLogs);
  }

  // Generate report
  logger.section('Generating Report');
  const report = Reporter.generateReport(results);
  Reporter.printReport(report);

  // Save report
  const outputDir = join(process.cwd(), 'reports');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  Reporter.saveReport(report, outputDir);

  // Upload to Notion if available
  if (connections.notion) {
    logger.info('Uploading report to Notion...');
    try {
      await notionService.createClassificationReport({
        title: `Musubi Classification Report - ${new Date().toLocaleDateString()}`,
        totalProcessed: report.totalProcessed,
        classified: report.classified,
        accuracy: report.accuracy,
        details: JSON.stringify(report.summary, null, 2),
      });
      logger.success('Report uploaded to Notion');
    } catch (error) {
      logger.warn('Failed to upload to Notion', error);
    }
  }

  // Summary
  logger.section('🎉 Phase 1 Complete');
  logger.info(`Sample processed: ${report.totalProcessed} conversations (out of ${allLogs.length} total)`);
  logger.info(`Classified: ${report.classified} (${(report.accuracy * 100).toFixed(2)}%)`);
  logger.info(`Success criteria: ${report.accuracy >= 0.9 && report.errorRate <= 0.05 ? '✅ PASSED' : '⚠️ NEEDS IMPROVEMENT'}`);
  
  logger.info('\nNext steps:');
  logger.info('  1. Review classification results in reports/ directory');
  logger.info('  2. If satisfied with accuracy, increase SAMPLE_SIZE in src/index.ts');
  logger.info(`  3. To process all ${allLogs.length} logs, set SAMPLE_SIZE = ${allLogs.length}`);
  logger.info('  4. Adjust keywords/patterns if accuracy needs improvement');
}

// Error handling
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Run
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

