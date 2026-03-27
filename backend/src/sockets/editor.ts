import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import { supabaseAdmin } from '../config/supabase';

interface EditorState {
  content: string;
  version: number;
}

// Memory cache for active sessions (last-write-wins)
const sessionContent = new Map<string, EditorState>();

export const setupEditorNamespace = (io: Server) => {
  const editorNamespace = io.of('/editor');

  editorNamespace.use(async (socket: Socket, next) => {
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

  editorNamespace.on('connection', (socket: Socket) => {
    const { sessionId } = socket.handshake.query;
    if (!sessionId) {
      socket.disconnect();
      return;
    }

    const room = `session:${sessionId}`;
    socket.join(room);

    // Send current content to new joiner
    const currentState = sessionContent.get(sessionId as string) || { content: '', version: 0 };
    socket.emit('editor-sync', currentState);

    socket.on('editor-change', (data: { content: string; version: number }) => {
      // Simple last-write-wins sync
      sessionContent.set(sessionId as string, data);
      
      // Broadcast to others in the room
      socket.to(room).emit('editor-change', data);
    });

    socket.on('language-change', (language: string) => {
      socket.to(room).emit('language-change', language);
    });

    socket.on('editor-output', (data: any) => {
      socket.to(room).emit('editor-output', data);
    });

    socket.on('cursor-move', (pos: { line: number, column: number }) => {
      socket.to(room).emit('cursor-move', {
        userId: socket.data.user.sub,
        name: socket.data.user.display_name || 'User',
        ...pos
      });
    });

    socket.on('disconnect', () => {
      // Clean up if last user? (Optional for MVP, maybe keep content till session ends)
    });
  });
};
