import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import { supabaseAdmin } from '../config/supabase';

export const setupChatNamespace = (io: Server) => {
  const chatNamespace = io.of('/chat');

  // Auth middleware for namespace
  chatNamespace.use(async (socket: Socket, next) => {
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

  chatNamespace.on('connection', (socket: Socket) => {
    const { sessionId } = socket.handshake.query;
    if (!sessionId) {
      socket.disconnect();
      return;
    }

    const room = `session:${sessionId}`;
    socket.join(room);

    console.log(`User ${socket.data.user.sub} connected to chat room ${room}`);

    // Broadcast Join Message (Small delay to ensure frontend is ready)
    setTimeout(() => {
      const joinMsg = {
        id: `sys-${Date.now()}`,
        session_id: sessionId,
        user_id: null,
        content: `${socket.data.user.display_name || 'A user'} joined the session`,
        created_at: new Date().toISOString(),
        profiles: null // Indicates system message
      };
      chatNamespace.to(room).emit('new-message', joinMsg);
    }, 500);

    socket.on('send-message', async (content: string) => {
      try {
        const { data: message, error } = await supabaseAdmin
          .from('messages')
          .insert({
            session_id: sessionId as string,
            user_id: socket.data.user.sub,
            content: content
          })
          .select(`
            *,
            profiles!messages_user_id_fkey(display_name)
          `)
          .single();

        if (error) throw error;
        chatNamespace.to(room).emit('new-message', message);
      } catch (err) {
        console.error('Chat error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('end-session', () => {
      if (socket.data.user.role !== 'mentor') return;
      
      const endMsg = {
        id: `sys-end-${Date.now()}`,
        session_id: sessionId,
        user_id: null,
        content: 'Mentor has ended the meeting',
        created_at: new Date().toISOString(),
        profiles: null
      };
      chatNamespace.to(room).emit('new-message', endMsg);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.sub} disconnected from chat`);
      const leaveMsg = {
        id: `sys-leave-${Date.now()}`,
        session_id: sessionId,
        user_id: null,
        content: `${socket.data.user.display_name || 'A user'} left the meeting`,
        created_at: new Date().toISOString(),
        profiles: null
      };
      chatNamespace.to(room).emit('new-message', leaveMsg);
    });
  });
};
