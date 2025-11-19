import type { Server, IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { commentEventEmitter, COMMENT_EVENTS } from './commentEvents';

type WebSocketWithHeartbeat = WebSocket & { isAlive?: boolean };

let isInitialized = false;

export const initializeCommentWebSocket = (server: Server) => {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  const wss = new WebSocketServer({ server, path: '/ws/comments' });

  console.log('📡 Comment WebSocket initialized at /ws/comments');

  const broadcast = (data: unknown) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client: WebSocketWithHeartbeat) => {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  };

  const handleCreated = (event: unknown) => broadcast(event);
  const handleUpdated = (event: unknown) => broadcast(event);
  const handleDeleted = (event: unknown) => broadcast(event);

  commentEventEmitter.on(COMMENT_EVENTS.CREATED, handleCreated);
  commentEventEmitter.on(COMMENT_EVENTS.UPDATED, handleUpdated);
  commentEventEmitter.on(COMMENT_EVENTS.DELETED, handleDeleted);

  wss.on('connection', (socket: WebSocketWithHeartbeat, request: IncomingMessage) => {
    try {
      const originProtocol =
        (request.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
      const host = request.headers.host ?? 'localhost';
      const url = new URL(request.url ?? '', `${originProtocol}://${host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(1008, 'Authentication required');
        return;
      }

      try {
        jwt.verify(token, env.JWT_SECRET);
      } catch (error) {
        console.error('[CommentWebSocket] Invalid token', error);
        socket.close(1008, 'Invalid token');
        return;
      }

    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
    } catch (error) {
      console.error('[CommentWebSocket] Error handling connection', error);
      socket.close(1011, 'Internal server error');
      return;
    }
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((client: WebSocketWithHeartbeat) => {
      const tracked = client as WebSocketWithHeartbeat;
      if (tracked.isAlive === false) {
        return tracked.terminate();
      }
      tracked.isAlive = false;
      tracked.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
    commentEventEmitter.off(COMMENT_EVENTS.CREATED, handleCreated);
    commentEventEmitter.off(COMMENT_EVENTS.UPDATED, handleUpdated);
    commentEventEmitter.off(COMMENT_EVENTS.DELETED, handleDeleted);
    isInitialized = false;
  });
};

