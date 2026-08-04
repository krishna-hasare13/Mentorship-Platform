import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { loadSessionAccess } from '../lib/sessionGuards';

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
    if (typeof sessionId !== 'string' || !sessionId) {
      socket.disconnect();
      return;
    }

    loadSessionAccess(sessionId, socket.data.user.sub).then((access) => {
      if (!access) {
        socket.disconnect();
        return;
      }

      const room = `session:${sessionId}`;
      
      // Prevent "Two Tabs" issue: if this user is already in the room, disconnect their OLD socket
      webrtcNamespace.in(room).fetchSockets().then(sockets => {
        for (const s of sockets) {
          if (s.data.user.sub === socket.data.user.sub && s.id !== socket.id) {
            console.log(`[WebRTC] Disconnecting stale socket ${s.id} for user ${s.data.user.sub}`);
            s.emit('duplicate-session');
            s.disconnect(true);
          }
        }
      });

      socket.join(room);

      // Notify others that a new peer joined ONLY when they are explicitly ready
      socket.on('ready', () => {
        socket.to(room).emit('peer-joined', { userId: socket.data.user.sub });
      });

      // Signaling relay
      socket.on('signal', (data: { target: string; signal: any }) => {
        if (!data || !data.signal) return;

        // Data contains the WebRTC signaling data (offer/answer/ice)
        // We broadcast it to the room or a specific target if we had multiple peers
        // For 1-on-1, just broadcasting to everyone else in the room works
        socket.to(room).emit('signal', {
          userId: socket.data.user.sub,
          signal: data.signal
        });
      });

      // Media state relay — when a peer toggles camera/mic, broadcast to the room
      socket.on('media-state', (data: { micOn: boolean; cameraOn: boolean }) => {
        socket.to(room).emit('peer-media-state', {
          userId: socket.data.user.sub,
          micOn: data.micOn,
          cameraOn: data.cameraOn
        });
      });

      socket.on('disconnect', () => {
        socket.to(room).emit('peer-left', { userId: socket.data.user.sub });
      });
    });
  });
};
