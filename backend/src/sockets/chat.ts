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

    socket.on('send-message', async (content: string) => {
      try {
        // Persist to Supabase
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

        // Broadcast to everyone in the room (including sender for sync)
        chatNamespace.to(room).emit('new-message', message);
      } catch (err) {
        console.error('Chat error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.sub} disconnected from chat`);
    });
  });
};
