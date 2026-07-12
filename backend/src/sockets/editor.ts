import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { loadSessionAccess } from '../lib/sessionGuards';

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
      socket.join(room);

      // Send current content to new joiner
      const currentState = sessionContent.get(sessionId) || { content: '', version: 0 };
      socket.emit('editor-sync', currentState);

      socket.on('editor-change', (data: { content: string; version: number }) => {
        if (typeof data?.content !== 'string' || typeof data?.version !== 'number') {
          return;
        }

        // Simple last-write-wins sync
        sessionContent.set(sessionId, data);
        
        // Broadcast to others in the room
        socket.to(room).emit('editor-change', data);
      });

      socket.on('language-change', (language: string) => {
        if (typeof language !== 'string' || !language.trim()) return;
        socket.to(room).emit('language-change', language);
      });

      socket.on('editor-output', (data: any) => {
        socket.to(room).emit('editor-output', data);
      });

      socket.on('cursor-move', (pos: { line: number, column: number }) => {
        if (typeof pos?.line !== 'number' || typeof pos?.column !== 'number') return;

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
  });
};
