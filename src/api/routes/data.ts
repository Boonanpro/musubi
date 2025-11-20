/**
 * Musubi - Data API Routes
 */

import { Router } from 'express';
import { readUncategorizedLogs } from '../../utils/fileReader.js';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { supabaseService } from '../../integrations/supabase.js';

export const dataRouter = Router();

/**
 * GET /api/data/status
 * Get current data quality status
 */
dataRouter.get('/status', async (req, res) => {
  try {
    const logs = readUncategorizedLogs(appConfig.cheki.basePath);
    
    // 簡易的な精度計算
    let classifiedCount = 0;
    for (const log of logs.slice(0, 100)) {
      // キーワードマッチングをテスト
      const content = log.content.toLowerCase();
      for (const project of appConfig.cheki.projects) {
        if (project.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
          classifiedCount++;
          break;
        }
      }
    }
    const accuracy = classifiedCount / 100;
    
    res.json({
      totalLogs: logs.length,
      classificationAccuracy: accuracy,
      sampleSize: 100,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Data status API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/data/logs/sample
 * Get sample logs for analysis
 */
dataRouter.get('/logs/sample', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const logs = readUncategorizedLogs(appConfig.cheki.basePath);
    
    const sample = logs.slice(0, limit).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      contentPreview: log.content.substring(0, 200),
      contentLength: log.content.length,
    }));
    
    res.json({
      sample,
      total: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Sample logs API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/data/analyze
 * Perform detailed data analysis
 */
dataRouter.get('/analyze', async (req, res) => {
  try {
    const logs = readUncategorizedLogs(appConfig.cheki.basePath);
    
    // サンプルで分析
    const sampleSize = Math.min(100, logs.length);
    const sample = logs.slice(0, sampleSize);
    
    // 分析結果
    const analysis = {
      totalLogs: logs.length,
      analyzedSample: sampleSize,
      findings: {
        // ファイルパス情報の有無
        hasFilePath: sample.filter(log => 
          log.content.match(/[A-Z]:[\\\/]/) || 
          log.content.match(/\/[\w-]+\//)
        ).length,
        
        // プロジェクト名の言及
        mentionsProject: sample.filter(log => {
          const content = log.content.toLowerCase();
          return appConfig.cheki.projects.some(p => 
            content.includes(p.name.toLowerCase())
          );
        }).length,
        
        // 平均コンテンツ長
        avgContentLength: sample.reduce((sum, log) => 
          sum + log.content.length, 0) / sampleSize,
        
        // キーワードマッチ率
        keywordMatchRate: sample.filter(log => {
          const content = log.content.toLowerCase();
          return appConfig.cheki.projects.some(p =>
            p.keywords.some(k => content.includes(k.toLowerCase()))
          );
        }).length / sampleSize,
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json(analysis);
  } catch (error) {
    logger.error('Data analysis API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/data/supabase/latest
 * Get latest data from Supabase
 */
dataRouter.get('/supabase/latest', async (req, res) => {
  try {
    // Supabaseに接続
    const hasSupabaseKey = appConfig.supabase.url && appConfig.supabase.key;
    
    if (!hasSupabaseKey) {
      return res.json({
        connected: false,
        message: 'Supabase credentials not configured',
      });
    }
    
    await supabaseService.connect();
    
    // 最新のデータを取得（直近24時間）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const conversations = await supabaseService.fetchConversations({
      startDate: yesterday.toISOString(),
      limit: 100,
    });
    
    res.json({
      connected: true,
      latestCount: conversations.length,
      conversations: conversations.slice(0, 10), // 最初の10件のみ返す
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Supabase latest API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/data/dev-logs
 * Clear all development logs from Supabase
 */
dataRouter.delete('/dev-logs', async (req, res) => {
  try {
    const hasSupabaseKey = appConfig.supabase.url && appConfig.supabase.key;
    
    if (!hasSupabaseKey) {
      return res.status(400).json({
        success: false,
        message: 'Supabase credentials not configured',
      });
    }
    
    await supabaseService.connect();
    const success = await supabaseService.clearDevelopmentLogs();
    
    if (success) {
      res.json({
        success: true,
        message: 'All development logs have been cleared',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to clear development logs',
      });
    }
  } catch (error) {
    logger.error('Clear dev logs API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

