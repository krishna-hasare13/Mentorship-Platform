import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import { supabaseAdmin } from '../config/supabase';

export const setupWebRTCNamespace = (io: Server) => {
  const webrtcNamespace = io.of('/webrtc');

  webrtcNamespace.use(async (socket: Socket, next) => {
    let token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) throw new Error('Authentication error');

      socket.data.user = {
        sub: user.id,
        email: user.email!,
        role: user.user_metadata?.role || 'student',
        display_name: user.user_metadata?.display_name
      };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  webrtcNamespace.on('connection', (socket: Socket) => {
    const { sessionId } = socket.handshake.query;
    if (!sessionId) {
      socket.disconnect();
      return;
    }

    const room = `session:${sessionId}`;
    socket.join(room);

    // Notify others that a new peer joined ONLY when they are explicitly ready
    socket.on('ready', () => {
      socket.to(room).emit('peer-joined', { userId: socket.data.user.sub });
    });

    // Signaling relay
    socket.on('signal', (data: { target: string; signal: any }) => {
      // Data contains the WebRTC signaling data (offer/answer/ice)
      // We broadcast it to the room or a specific target if we had multiple peers
      // For 1-on-1, just broadcasting to everyone else in the room works
      socket.to(room).emit('signal', {
        userId: socket.data.user.sub,
        signal: data.signal
      });
    });

    socket.on('disconnect', () => {
      socket.to(room).emit('peer-left', { userId: socket.data.user.sub });
    });
  });
};
