'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/providers/AuthProvider';

import { getBackendUrl } from '@/lib/api';

export const useSocket = (namespace: string, sessionId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { session } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const accessToken = session?.access_token;

  useEffect(() => {
    if (!sessionId || !accessToken) return;

    const baseUrl = getBackendUrl();
    if (!baseUrl) return;

    const s = io(`${baseUrl}${namespace}`, {
      auth: {
        token: accessToken
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
  }, [namespace, sessionId, accessToken]);

  return socket;
};
