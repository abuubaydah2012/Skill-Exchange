import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { verifyToken, TokenPayload } from './utils/jwt.js';

let io: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Initialize Socket.IO instance and attach to HTTP server
 */
export const initSocket = (httpServer: HTTPServer, corsOptions: any): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication middleware: verify JWT token passed in handshake auth or headers
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader);

      if (!token) {
        return next(new Error('Authentication error: Missing token.'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token payload.'));
      }

      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      socket.data.role = decoded.role;
      next();
    } catch (err: any) {
      console.warn('[Socket.IO Auth Error]', err.message);
      next(new Error(`Authentication error: ${err.message || 'Unauthorized'}`));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.data?.userId;

    if (userId) {
      // Join user to their private room for direct messaging & notifications
      authSocket.join(userId);
      console.log(`[Socket.IO] User connected: ${userId} (Socket: ${authSocket.id})`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${userId} (Reason: ${reason})`);
    });
  });

  return io;
};

/**
 * Get the current Socket.IO server instance
 */
export const getIO = (): SocketIOServer | null => {
  return io;
};

/**
 * Emit an event to a specific user's private room
 */
export const emitToUser = (userId: string, event: string, data: any): boolean => {
  if (!io) {
    console.warn('[Socket.IO] Cannot emit event: Socket.IO server not initialized');
    return false;
  }
  io.to(userId.toString()).emit(event, data);
  return true;
};

/**
 * Emit an event to multiple users
 */
export const emitToUsers = (userIds: string[], event: string, data: any): boolean => {
  if (!io) {
    console.warn('[Socket.IO] Cannot emit event: Socket.IO server not initialized');
    return false;
  }
  userIds.forEach((uid) => {
    io?.to(uid.toString()).emit(event, data);
  });
  return true;
};
