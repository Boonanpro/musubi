/**
 * Musubi - Shared WebSocket Server
 * すべてのプロジェクトが共有するWebSocketサーバー
 * プロジェクトIDでルームを分離してメッセージをルーティング
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';

let sharedServer: http.Server | null = null;
let io: SocketIOServer | null = null;
const PORT = 3000;

/**
 * 共有WebSocketサーバーを起動
 */
export function startSharedWebSocketServer(): void {
  if (sharedServer) {
    logger.info('[Shared WebSocket] Server already running');
    return;
  }

  const app = express();
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  sharedServer = http.createServer(app);

  io = new SocketIOServer(sharedServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // 接続時の処理
  io.on('connection', (socket) => {
    logger.info(`[Shared WebSocket] Client connected: ${socket.id}`);

    // プロジェクトIDを取得（クエリパラメータまたは接続時のイベントから）
    const projectId = socket.handshake.query.projectId as string | undefined;
    
    if (projectId) {
      // プロジェクトIDのルームに参加
      socket.join(`project:${projectId}`);
      logger.info(`[Shared WebSocket] Client ${socket.id} joined project: ${projectId}`);
      
      // 接続成功を通知
      socket.emit('connected', { projectId, message: 'Connected to shared server' });
      
      // オンラインユーザー数をブロードキャスト
      const room = io!.sockets.adapter.rooms.get(`project:${projectId}`);
      const userCount = room ? room.size : 0;
      io!.to(`project:${projectId}`).emit('onlineCount', { count: userCount });
    } else {
      logger.warn(`[Shared WebSocket] Client ${socket.id} connected without projectId`);
      socket.emit('error', { message: 'projectId is required' });
    }

    // 汎用的なチャットメッセージ（プロジェクトIDでルーム分離）
    socket.on('chat message', (data: any) => {
      if (projectId) {
        // プロジェクトルーム内の全クライアントにブロードキャスト
        io!.to(`project:${projectId}`).emit('chat message', {
          ...data,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });
        logger.info(`[Shared WebSocket] Chat message in project ${projectId}: ${JSON.stringify(data).substring(0, 100)}`);
      }
    });

    // ユーザー名登録（プロジェクトIDでルーム分離）
    socket.on('join', (data: { username: string }) => {
      if (projectId) {
        socket.data.username = data.username;
        // プロジェクトルーム内の全クライアントに通知
        io!.to(`project:${projectId}`).emit('userJoined', {
          username: data.username,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });
        
        // オンラインユーザー数を更新
        const room = io!.sockets.adapter.rooms.get(`project:${projectId}`);
        const userCount = room ? room.size : 0;
        io!.to(`project:${projectId}`).emit('onlineCount', { count: userCount });
        
        logger.info(`[Shared WebSocket] User ${data.username} joined project ${projectId}`);
      }
    });

    // タイピングインジケーター
    socket.on('typing', (data: { username: string }) => {
      if (projectId) {
        socket.to(`project:${projectId}`).emit('typing', data);
      }
    });

    socket.on('stop typing', () => {
      if (projectId) {
        socket.to(`project:${projectId}`).emit('stop typing');
      }
    });

    // 切断時の処理
    socket.on('disconnect', () => {
      logger.info(`[Shared WebSocket] Client disconnected: ${socket.id}`);
      if (projectId) {
        // オンラインユーザー数を更新
        const room = io!.sockets.adapter.rooms.get(`project:${projectId}`);
        const userCount = room ? room.size : 0;
        io!.to(`project:${projectId}`).emit('onlineCount', { count: userCount });
        
        // ユーザー退出を通知
        if (socket.data.username) {
          io!.to(`project:${projectId}`).emit('userLeft', {
            username: socket.data.username,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  });

  // ヘルスチェックエンドポイント
  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Musubi Shared WebSocket Server',
      port: PORT,
      connectedClients: io ? io.sockets.sockets.size : 0,
    });
  });

  sharedServer.listen(PORT, '0.0.0.0', () => {
    logger.success(`[Shared WebSocket] Server running on port ${PORT} (mapped to 3004 on host)`);
  });
}

/**
 * 共有WebSocketサーバーを停止
 */
export function stopSharedWebSocketServer(): void {
  if (io) {
    io.close();
    io = null;
  }
  if (sharedServer) {
    sharedServer.close();
    sharedServer = null;
  }
  logger.info('[Shared WebSocket] Server stopped');
}

