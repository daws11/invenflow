import { useCallback, useEffect, useRef, useState } from 'react';

export type InventoryWebSocketStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export type InventoryWebSocketEvent = {
  type: string;
  [key: string]: unknown;
};

export interface UseInventoryWebSocketOptions {
  autoConnect?: boolean;
  onEvent?: (event: InventoryWebSocketEvent) => void;
}

const getWebSocketUrl = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return null;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/api';
  const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/inventory';
  url.searchParams.set('token', token);
  return url.toString();
};

export const useInventoryWebSocket = (options: UseInventoryWebSocketOptions = {}) => {
  const { autoConnect = true, onEvent } = options;

  const [status, setStatus] = useState<InventoryWebSocketStatus>('idle');

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const manualDisconnectRef = useRef(false);
  const eventHandlerRef = useRef<typeof onEvent>();
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    eventHandlerRef.current = onEvent;
  }, [onEvent]);

  const scheduleReconnect = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (reconnectTimerRef.current !== null) {
      return;
    }

    const delay = Math.min(30000, 1000 * 2 ** reconnectAttemptsRef.current);
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
    reconnectAttemptsRef.current += 1;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current || typeof window === 'undefined') {
      return;
    }

    const url = getWebSocketUrl();
    if (!url) {
      return;
    }

    manualDisconnectRef.current = false;
    setStatus((prev) => (prev === 'idle' ? 'connecting' : 'reconnecting'));

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setStatus('connected');
    };

    socket.onmessage = (event) => {
      const handler = eventHandlerRef.current;
      if (!handler) {
        return;
      }
      try {
        const data = JSON.parse(event.data) as InventoryWebSocketEvent;
        if (data?.type) {
          handler(data);
        }
      } catch (error) {
        console.error('[useInventoryWebSocket] Failed to parse message', error);
      }
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onclose = () => {
      socketRef.current = null;
      setStatus('disconnected');
      if (!manualDisconnectRef.current) {
        scheduleReconnect();
      }
    };
  }, [scheduleReconnect]);

  connectRef.current = connect;

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    if (!autoConnect) {
      return () => {
        disconnect();
      };
    }

    connect();

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    connect,
    disconnect,
    isConnected: status === 'connected',
  };
};

