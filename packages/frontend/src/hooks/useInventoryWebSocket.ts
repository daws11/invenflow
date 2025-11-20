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

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch (error) {
    console.error('[useInventoryWebSocket] Invalid API URL', { baseUrl, error });
    return null;
  }

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/inventory';
  url.searchParams.set('token', token);

  if (!url.host) {
    console.error('[useInventoryWebSocket] WebSocket URL missing host', { baseUrl });
    return null;
  }

  const connectionDetails = `${url.protocol}//${url.host}${url.pathname}`;
  console.debug('[useInventoryWebSocket] Prepared WebSocket URL', connectionDetails);
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

    const sanitisedUrl = url.replace(/(\?.*)$/, '');

    socket.onerror = (event) => {
      console.error('[useInventoryWebSocket] WebSocket error', {
        url: sanitisedUrl,
        readyState: socket.readyState,
        event,
      });
      socket.close();
    };

    socket.onclose = (event) => {
      socketRef.current = null;
      setStatus('disconnected');
      console.warn('[useInventoryWebSocket] WebSocket closed', {
        url: sanitisedUrl,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      if (
        !manualDisconnectRef.current &&
        event.code !== 1008
      ) {
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

