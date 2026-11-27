/**
 * Skill Exchange Real-Time Socket Service
 * Manages authenticated client WebSocket/Socket.IO connections.
 */
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export const getSocketUrl = (): string => {
  const envApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (envApiUrl) {
    return envApiUrl.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    if (import.meta.env.DEV) {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

/**
 * Connect to the Socket.IO server using the authenticated JWT token.
 * Reconnects if the token changes or if previously disconnected.
 */
export const connectSocket = (token: string): Socket => {
  if (!token) {
    throw new Error('[Socket.IO] Cannot connect without an authentication token.');
  }

  // Reuse existing socket if connected with identical token
  if (socket && currentToken === token && socket.connected) {
    return socket;
  }

  // Disconnect any stale or previous socket session
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  const socketUrl = getSocketUrl();

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log(`[Socket.IO] Connected to real-time server (${socket?.id})`);
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket.IO] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
  });

  return socket;
};

/**
 * Get active socket instance if connected
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Disconnect socket and clean up listeners
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
    console.log('[Socket.IO] Socket explicitly disconnected and cleared');
  }
};
