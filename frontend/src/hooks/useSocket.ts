'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/providers/AuthProvider';

import { getBackendUrl } from '@/lib/api';

export const useSocket = (namespace: string, sessionId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { session } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const baseUrl = getBackendUrl();
    if (!baseUrl) return;

    const s = io(`${baseUrl}${namespace}`, {
      auth: {
        token: session?.access_token
      },
      query: {
        sessionId
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log(`Connected to ${namespace} socket`);
    });

    s.on('connect_error', (err) => {
      console.error(`${namespace} socket error:`, err.message);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [namespace, sessionId]);

  // Handle token updates without destroying the socket
  useEffect(() => {
    if (socketRef.current && session?.access_token) {
      socketRef.current.auth = { token: session.access_token };
      // If disconnected, it will use the new token on next reconnect
    }
  }, [session?.access_token]);

  return socket;
};
